import { createHash, randomBytes } from 'node:crypto';

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createReportShareToken() {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: hashReportShareToken(token) };
}

export function hashReportShareToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

export function isReportShareToken(token: string) {
    return SHARE_TOKEN_PATTERN.test(token);
}

export function reportShareExpiry(days: number, now = new Date()) {
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
    return expiresAt;
}
