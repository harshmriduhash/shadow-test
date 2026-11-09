const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createApiResponseCache } = require('../dist/cache.js');

test('Redis response cache is scoped to the bearer token and invalidated by writes', async t => {
    const values = new Map();
    const store = {
        async get(key) {
            return values.get(key) ?? null;
        },
        async set(key, value, options) {
            assert.equal(options.EX, 15);
            values.set(key, value);
            return 'OK';
        },
        async incr(key) {
            const value = Number(values.get(key) || '0') + 1;
            values.set(key, String(value));
            return value;
        }
    };
    const app = express();
    app.use(express.json());
    app.use('/api', createApiResponseCache(store));
    let responseCount = 0;
    let documentCount = 0;
    app.get('/api/projects', (_req, res) => res.json({ count: ++responseCount }));
    app.get('/api/projects/project-1/documents', (_req, res) => res.json({ count: ++documentCount }));
    app.post('/api/projects', (_req, res) => res.status(201).json({ created: true }));

    const server = app.listen(0);
    t.after(() => new Promise(resolve => server.close(resolve)));
    await new Promise(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}/api/projects`;
    const getCount = async authorization => {
        const response = await fetch(baseUrl, { headers: { Authorization: authorization } });
        return (await response.json()).count;
    };

    assert.equal(await getCount('Bearer user-a'), 1);
    assert.equal(await getCount('Bearer user-a'), 1);
    assert.equal(await getCount('Bearer user-b'), 2);
    const getDocuments = async () => {
        const response = await fetch(`${baseUrl}/project-1/documents`, {
            headers: { Authorization: 'Bearer user-a' }
        });
        return (await response.json()).count;
    };
    assert.equal(await getDocuments(), 1);
    assert.equal(await getDocuments(), 2);
    const write = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer user-a', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new project' })
    });
    assert.equal(write.status, 201);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(await getCount('Bearer user-a'), 3);
});
