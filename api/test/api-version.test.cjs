const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../dist/index.js');

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
    if (!server) return;
    await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
});

test('versioned API wraps success responses and correlates the request ID', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const requestId = response.headers.get('x-request-id');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(requestId);
    assert.deepEqual(body, {
        data: { status: 'ok', service: 'ShadowTest API' },
        requestId
    });
});

test('versioned API returns structured errors with request IDs', async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'HTTP_401');
    assert.equal(body.error.message, 'Authentication required');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
});

test('legacy API routes keep their response shape during migration', async () => {
    const response = await fetch(`${baseUrl}/api/projects`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: 'Authentication required' });
    assert.ok(response.headers.get('x-request-id'));
});

test('trusted request IDs are echoed and unsafe request IDs are replaced', async () => {
    const trusted = await fetch(`${baseUrl}/api/v1/health`, {
        headers: { 'x-request-id': 'test.request-123' }
    });
    assert.equal(trusted.headers.get('x-request-id'), 'test.request-123');

    const unsafe = await fetch(`${baseUrl}/api/v1/health`, {
        headers: { 'x-request-id': 'not a valid request id' }
    });
    assert.notEqual(unsafe.headers.get('x-request-id'), 'not a valid request id');
    assert.ok(unsafe.headers.get('x-request-id'));
});
