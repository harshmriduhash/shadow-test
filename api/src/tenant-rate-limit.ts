import { createHash, randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { createRedisClient } from './redis-client';

const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 100;
const WINDOW_MILLISECONDS = WINDOW_SECONDS * 1000;
const localBuckets = new Map<string, number[]>();
let redisClient: ReturnType<typeof createRedisClient> | undefined;

function getLimit() {
    const limit = Number(process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE ?? DEFAULT_LIMIT);
    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE must be a positive integer');
    }
    return limit;
}

function redis() {
    if (!process.env.REDIS_URL) return undefined;
    if (!redisClient) {
        redisClient = createRedisClient(process.env.REDIS_URL);
        redisClient.on('error', error => console.error('Tenant rate-limit Redis error:', error));
    }
    return redisClient;
}

type WindowCount = { count: number; resetIn: number };
type WindowResult = { allowed: boolean; counts: WindowCount[] };

function localCounts(keys: string[], limit: number) {
    const now = Date.now();
    const cutoff = now - WINDOW_MILLISECONDS;
    const entries = keys.map(key => {
        const timestamps = (localBuckets.get(key) || []).filter(timestamp => timestamp > cutoff);
        localBuckets.set(key, timestamps);
        return timestamps;
    });
    const allowed = entries.every(timestamps => timestamps.length < limit);
    if (allowed) {
        for (const timestamps of entries) timestamps.push(now);
    }
    if (localBuckets.size > 10_000) {
        for (const [bucketKey, timestamps] of localBuckets) {
            if (timestamps.length === 0) localBuckets.delete(bucketKey);
        }
    }
    return {
        allowed,
        counts: entries.map(timestamps => ({
            count: timestamps.length,
            resetIn: timestamps.length
                ? Math.max(1, Math.ceil((timestamps[0] + WINDOW_MILLISECONDS - now) / 1000))
                : WINDOW_SECONDS
        }))
    };
}

async function redisCounts(keys: string[], limit: number) {
    const client = redis();
    if (!client) return localCounts(keys, limit);
    if (!client.isOpen) await client.connect();
    const result: unknown = await client.eval(
        `local now = tonumber(ARGV[1])
        local cutoff = now - tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local member = ARGV[4]
        local counts = {}
        local blocked = false
        for i, key in ipairs(KEYS) do
            redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
            local count = redis.call('ZCARD', key)
            counts[i] = count
            if count >= limit then blocked = true end
        end
        for i, key in ipairs(KEYS) do
            if not blocked then
                redis.call('ZADD', key, now, member)
                redis.call('PEXPIRE', key, tonumber(ARGV[2]))
                counts[i] = counts[i] + 1
            end
            local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
            local resetIn = tonumber(ARGV[2]) / 1000
            if oldest[2] then
                resetIn = math.max(1, math.ceil((tonumber(oldest[2]) + tonumber(ARGV[2]) - now) / 1000))
            end
            counts[i] = { counts[i], resetIn }
        end
        return { blocked and 0 or 1, counts }`,
        {
            keys,
            arguments: [
                String(Date.now()),
                String(WINDOW_MILLISECONDS),
                String(limit),
                randomUUID()
            ]
        }
    );
    if (
        !Array.isArray(result)
        || result.length !== 2
        || typeof result[0] !== 'number'
        || !Array.isArray(result[1])
        || result[1].length !== keys.length
    ) {
        throw new Error('Redis returned an invalid tenant rate-limit result');
    }
    return {
        allowed: result[0] === 1,
        counts: result[1].map(item => {
            if (!Array.isArray(item) || typeof item[0] !== 'number' || typeof item[1] !== 'number') {
                throw new Error('Redis returned an invalid tenant rate-limit counter');
            }
            return { count: item[0], resetIn: Math.max(1, item[1]) };
        })
    };
}

function sendRateLimitResult(
    result: WindowResult,
    limit: number,
    res: Parameters<RequestHandler>[1]
) {
    const remaining = Math.max(0, limit - Math.max(...result.counts.map(count => count.count)));
    const resetIn = Math.max(...result.counts.map(count => count.resetIn));
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetIn));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetIn));
    if (!result.allowed) {
        res.setHeader('Retry-After', String(resetIn));
        res.status(429).json({ error: 'Request rate limit exceeded. Retry after the indicated interval.' });
        return false;
    }
    return true;
}

function applyRateLimit(
    keys: string[],
    limit: number,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
) {
    void redisCounts(keys, limit).then(result => {
        if (sendRateLimitResult(result, limit, res)) next();
    }).catch(error => {
        console.error('Rate-limit check failed:', error);
        res.status(503).json({ error: 'Request rate limiting is temporarily unavailable.' });
    });
}

export const tenantRateLimit: RequestHandler = (req, res, next) => {
    if (!req.auth) return next(new Error('Tenant rate limiter requires an authenticated request'));
    let limit: number;
    try {
        limit = getLimit();
    } catch (error) {
        return next(error);
    }

    const keys = [
        `shadowtest:rate:user:${req.auth.userId}`,
        `shadowtest:rate:organization:${req.auth.organizationId || `personal_${req.auth.userId}`}`
    ];
    applyRateLimit(keys, limit, res, next);
};

export const ipRateLimit: RequestHandler = (req, res, next) => {
    const limit = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 120);
    if (!Number.isInteger(limit) || limit < 1) {
        return next(new Error('API_RATE_LIMIT_PER_MINUTE must be a positive integer'));
    }
    applyRateLimit([ipRateLimitKey(req)], limit, res, next);
};

function ipRateLimitKey(req: Parameters<RequestHandler>[0]) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');
    return `shadowtest:rate:ip:${ipHash}`;
}

export const unauthenticatedIpRateLimit: RequestHandler = (req, res, next) => {
    const limit = Number(process.env.API_RATE_LIMIT_UNAUTHENTICATED_PER_IP_PER_MINUTE ?? 20);
    if (!Number.isInteger(limit) || limit < 1) {
        return next(new Error('API_RATE_LIMIT_UNAUTHENTICATED_PER_IP_PER_MINUTE must be a positive integer'));
    }
    applyRateLimit([`shadowtest:rate:unauthenticated:${ipRateLimitKey(req)}`], limit, res, next);
};

export async function closeRateLimitClient() {
    if (redisClient?.isOpen) await redisClient.quit();
}
