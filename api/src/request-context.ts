import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';

declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}

export const requestContext: RequestHandler = (req, res, next) => {
    const incomingRequestId = req.header('x-request-id');
    const requestId = incomingRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const versionedApiEnvelope: RequestHandler = (req, res, next) => {
    const sendJson = res.json.bind(res);
    res.json = ((body: unknown) => {
        const requestId = req.requestId;
        if (res.statusCode >= 400) {
            const payload = isRecord(body) ? body : {};
            const sourceError = payload.error;
            const sourceErrorRecord = isRecord(sourceError) ? sourceError : undefined;
            const message = typeof sourceError === 'string'
                ? sourceError
                : typeof sourceErrorRecord?.message === 'string'
                    ? sourceErrorRecord.message
                    : 'Request failed';
            const code = typeof sourceErrorRecord?.code === 'string'
                ? sourceErrorRecord.code
                : typeof payload.code === 'string'
                    ? payload.code
                    : `HTTP_${res.statusCode}`;
            const details = payload.details ?? sourceErrorRecord?.details;

            return sendJson({
                error: {
                    code,
                    message,
                    ...(details === undefined ? {} : { details }),
                    requestId
                }
            });
        }

        return sendJson({ data: body, requestId });
    }) as Response['json'];
    next();
};
