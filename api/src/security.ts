import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';

declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                email?: string;
                organizationId?: string;
                organizationName?: string;
                organizationRole?: string;
            };
        }
    }
}

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
    if (remoteJwks) return remoteJwks;
    const jwksUrl = process.env.CLERK_JWKS_URL
        || (process.env.CLERK_ISSUER_URL ? `${process.env.CLERK_ISSUER_URL.replace(/\/$/, '')}/.well-known/jwks.json` : undefined);
    if (!jwksUrl) throw new Error('CLERK_JWKS_URL or CLERK_ISSUER_URL is required');

    remoteJwks = createRemoteJWKSet(new URL(jwksUrl));
    return remoteJwks;
}

export async function verifySessionToken(token: string): Promise<{
    userId: string;
    email?: string;
    organizationId?: string;
    organizationName?: string;
    organizationRole?: string;
}> {
    const verificationOptions: { issuer?: string; audience?: string } = {};
    if (process.env.CLERK_ISSUER_URL) verificationOptions.issuer = process.env.CLERK_ISSUER_URL;
    if (process.env.CLERK_JWT_AUDIENCE) verificationOptions.audience = process.env.CLERK_JWT_AUDIENCE;

    const { payload } = await jwtVerify(token, getJwks(), verificationOptions);
    const userId = payload.sub;
    if (!userId) throw new Error('Session token is missing its subject');

    const email = getEmail(payload);
    const organizationId = typeof payload.org_id === 'string' ? payload.org_id : undefined;
    const organizationName = typeof payload.org_name === 'string' ? payload.org_name : undefined;
    const organizationRole = typeof payload.org_role === 'string' ? payload.org_role : undefined;
    return {
        userId,
        ...(email ? { email } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(organizationName ? { organizationName } : {}),
        ...(organizationRole ? { organizationRole } : {})
    };
}

function getEmail(payload: JWTPayload): string | undefined {
    const email = payload.email;
    return typeof email === 'string' && email.length > 0 ? email : undefined;
}

export const requireSession: RequestHandler = (req, res, next) => {
    const authorization = req.header('authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    void verifySessionToken(token)
        .then(auth => {
            req.auth = auth;
            next();
        })
        .catch(error => {
            if (error instanceof Error && error.message.includes('CLERK_')) {
                console.error('Authentication configuration error:', error.message);
                return res.status(503).json({ error: 'Authentication service is not configured' });
            }
            return res.status(401).json({ error: 'Invalid or expired session' });
        });
};

function safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export const requireInternalAuth: RequestHandler = (req, res, next) => {
    const expected = process.env.INTERNAL_API_KEY;
    const provided = req.header('x-internal-api-key');
    if (!expected) {
        console.error('INTERNAL_API_KEY is not configured');
        return res.status(503).json({ error: 'Internal service authentication is not configured' });
    }
    if (!provided || !safeEqual(provided, expected)) {
        return res.status(401).json({ error: 'Invalid internal service credentials' });
    }
    next();
};

export function getAuthenticatedUserId(req: Request) {
    if (!req.auth) throw new Error('Authenticated user context is missing');
    return req.auth.userId;
}
