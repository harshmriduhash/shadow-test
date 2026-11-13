import type { Request, RequestHandler } from 'express';

export function parseAllowedOrigins(value: string | undefined, production = false): string[] {
    if (production && !value?.trim()) {
        throw new Error('ALLOWED_ORIGINS must be configured in production');
    }

    const origins = (value || 'http://localhost:3000')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    for (const origin of origins) {
        if (origin === '*') {
            throw new Error('CORS entries must be exact HTTP(S) origins: *');
        }
        let parsed: URL;
        try {
            parsed = new URL(origin);
        } catch {
            throw new Error(`Invalid CORS origin: ${origin}`);
        }
        if (
            !['http:', 'https:'].includes(parsed.protocol)
            || parsed.origin !== origin
            || parsed.username
            || parsed.password
            || origin === '*'
        ) {
            throw new Error(`CORS entries must be exact HTTP(S) origins: ${origin}`);
        }
    }

    return [...new Set(origins)];
}

export function isAllowedOrigin(request: Request, allowedOrigins: string[]): boolean {
    const origin = request.header('origin');
    return !origin || allowedOrigins.includes(origin);
}

export const securityHeaders: RequestHandler = (_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
};
