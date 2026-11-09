import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

async function proxyRequest(request: NextRequest, path: string[]) {
    if (!allowedMethods.has(request.method)) {
        return NextResponse.json({ error: 'This API method is not supported.' }, { status: 405 });
    }

    const apiBase = process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
        return NextResponse.json(
            { error: 'The application API is not configured. Set API_SERVER_URL in the web deployment environment.' },
            { status: 503 }
        );
    }

    let target: URL;
    try {
        target = new URL(`${apiBase.replace(/\/+$/, '')}/${path.map(encodeURIComponent).join('/')}`);
    } catch {
        return NextResponse.json({ error: 'The configured API server URL is invalid.' }, { status: 503 });
    }

    if (target.protocol !== 'https:' && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
        return NextResponse.json({ error: 'The configured API server must use HTTPS.' }, { status: 503 });
    }

    target.search = request.nextUrl.search;
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'accept']) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }

    try {
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            ...(request.method === 'GET' ? {} : { body: await request.arrayBuffer() }),
            cache: 'no-store',
            signal: AbortSignal.timeout(20_000),
        });
        const responseHeaders = new Headers();
        const contentType = upstream.headers.get('content-type');
        if (contentType) responseHeaders.set('content-type', contentType);
        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Unable to reach the configured ShadowTest API:', error);
        return NextResponse.json(
            { error: 'The ShadowTest API could not be reached. Check the API service status and API_SERVER_URL.' },
            { status: 502 }
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
