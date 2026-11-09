import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type RedisCacheStore = {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options: { EX: number }): Promise<unknown>;
    incr(key: string): Promise<number>;
};

const CACHE_TTL_SECONDS = 15;
const CACHEABLE_GET_PATH = /^\/projects(?:\/[^/]+(?:\/personas)?)?$/;

function tokenDigest(request: Request) {
    const authorization = request.header('authorization');
    if (!authorization) return undefined;
    return createHash('sha256').update(authorization).digest('hex');
}

function cacheable(request: Request) {
    return request.method === 'GET' && CACHEABLE_GET_PATH.test(request.path);
}

export function createApiResponseCache(store?: RedisCacheStore): RequestHandler {
    return (request: Request, response: Response, next: NextFunction) => {
        if (!store) return next();
        const digest = tokenDigest(request);
        if (!digest) return next();
        const versionKey = `shadowtest:api-cache:version:${digest}`;

        if (!cacheable(request)) {
            response.on('finish', () => {
                if (request.method !== 'GET' && response.statusCode < 400) {
                    void store.incr(versionKey).catch(error => {
                        console.error('Unable to invalidate the API response cache:', error);
                    });
                }
            });
            return next();
        }

        void (async () => {
            try {
                const version = await store.get(versionKey) || '0';
                const cacheKey = `shadowtest:api-cache:${digest}:${version}:${createHash('sha256').update(request.originalUrl).digest('hex')}`;
                const cached = await store.get(cacheKey);
                if (cached) {
                    const entry = JSON.parse(cached) as { statusCode: number; body: unknown };
                    return response.status(entry.statusCode).json(entry.body);
                }

                const sendJson = response.json.bind(response);
                response.json = ((body: unknown) => {
                    if (response.statusCode < 400) {
                        const serialized = JSON.stringify({ statusCode: response.statusCode, body });
                        void store.set(cacheKey, serialized, { EX: CACHE_TTL_SECONDS }).catch(error => {
                            console.error('Unable to write the API response cache:', error);
                        });
                    }
                    return sendJson(body);
                }) as Response['json'];
                next();
            } catch (error) {
                console.error('Unable to read the API response cache:', error);
                next();
            }
        })();
    };
}
