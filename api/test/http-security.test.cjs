const test = require('node:test');
const assert = require('node:assert/strict');
process.env.REDIS_URL = '';
const { app } = require('../dist/index.js');
const { isAllowedOrigin, parseAllowedOrigins } = require('../dist/http-security.js');

test('production CORS requires explicit exact origins', () => {
    assert.throws(() => parseAllowedOrigins(undefined, true), /must be configured/);
    assert.throws(() => parseAllowedOrigins('*', true), /exact HTTP\(S\) origins/);
    assert.throws(() => parseAllowedOrigins('https://example.com/path', true), /exact HTTP\(S\) origins/);
    assert.deepEqual(
        parseAllowedOrigins('https://app.example.test, https://app.example.test', true),
        ['https://app.example.test']
    );
});

test('CORS policy rejects unlisted origins while allowing requests without Origin', () => {
    const request = origin => ({ header: () => origin });
    assert.equal(isAllowedOrigin(request('https://app.example.test'), ['https://app.example.test']), true);
    assert.equal(isAllowedOrigin(request('https://attacker.example'), ['https://app.example.test']), false);
    assert.equal(isAllowedOrigin(request(undefined), ['https://app.example.test']), true);
});

test('API rejects disallowed origins and returns security headers', async t => {
    const previousOrigins = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    const server = app.listen(0);
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        if (previousOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
        else process.env.ALLOWED_ORIGINS = previousOrigins;
    });
    await new Promise(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
        headers: { Origin: 'https://attacker.example' }
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'Origin is not allowed' });
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
});
