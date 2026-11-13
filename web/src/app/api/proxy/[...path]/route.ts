import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

async function proxyRequest(request: NextRequest, path: string[]) {
    const incomingRequestId = request.headers.get('x-request-id');
    const requestId = incomingRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();
    if (!allowedMethods.has(request.method)) {
        return NextResponse.json(
            { error: 'This API method is not supported.' },
            { status: 405, headers: { 'x-request-id': requestId } }
        );
    }

    const configuredApiBase = process.env.API_SERVER_URL
        || process.env.NEXT_PUBLIC_API_URL
        || 'https://shadowtest-api.onrender.com/api';

    let target: URL;
    try {
        const base = configuredApiBase.replace(/\/+$/, '');
        const versionedApiBase = /\/api\/v1$/i.test(base)
            ? base
            : /\/api$/i.test(base)
                ? `${base}/v1`
                : `${base}/api/v1`;
        target = new URL(`${versionedApiBase}/${path.map(encodeURIComponent).join('/')}`);
    } catch {
        return NextResponse.json(
            { error: 'The configured API server URL is invalid.' },
            { status: 503, headers: { 'x-request-id': requestId } }
        );
    }

    if (target.protocol !== 'https:' && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
        return NextResponse.json(
            { error: 'The configured API server must use HTTPS.' },
            { status: 503, headers: { 'x-request-id': requestId } }
        );
    }

    target.search = request.nextUrl.search;
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'accept']) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }
    headers.set('x-request-id', requestId);

    try {
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            ...(request.method === 'GET' ? {} : { body: await request.arrayBuffer() }),
            cache: 'no-store',
            signal: AbortSignal.timeout(20_000),
        });
        const responseHeaders = new Headers();
        for (const name of ['content-type', 'cache-control', 'x-robots-tag', 'x-request-id']) {
            const value = upstream.headers.get(name);
            if (value) responseHeaders.set(name, value);
        }
        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Unable to reach the configured ShadowTest API:', error);
        return NextResponse.json(
            { error: 'The ShadowTest API could not be reached. Check the API service status and API_SERVER_URL.' },
            { status: 502, headers: { 'x-request-id': requestId } }
        );
    }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
    return proxyRequest(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    return proxyRequest(request, (await params).path);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    return proxyRequest(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    return proxyRequest(request, (await params).path);
}
