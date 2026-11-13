const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { closeRateLimitClient, tenantRateLimit } = require('../dist/tenant-rate-limit.js');

function invoke(request) {
    return new Promise((resolve, reject) => {
        const headers = {};
        let statusCode = 200;
        const response = {
            setHeader: (name, value) => { headers[name] = value; },
            status: code => {
                statusCode = code;
                return response;
            },
            json: body => resolve({ statusCode, headers, body })
        };
        tenantRateLimit(request, response, error => {
            if (error) return reject(error);
            resolve({ statusCode, headers });
        });
    });
}

test('Redis Lua sliding window enforces shared user and organization counters', {
    skip: !process.env.REDIS_URL
}, async () => {
    const previousLimit = process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE;
    process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE = '2';
    const identity = {
        userId: `integration-user-${randomUUID()}`,
        organizationId: `integration-org-${randomUUID()}`
    };

    try {
        assert.equal((await invoke({ auth: identity })).statusCode, 200);
        assert.equal((await invoke({ auth: identity })).statusCode, 200);
        const limited = await invoke({ auth: identity });
        assert.equal(limited.statusCode, 429);
        assert.equal(limited.headers['Retry-After'] > 0, true);
    } finally {
        if (previousLimit === undefined) delete process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE;
        else process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE = previousLimit;
        await closeRateLimitClient();
    }
});
