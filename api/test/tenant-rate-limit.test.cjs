const test = require('node:test');
const assert = require('node:assert/strict');
const {
    ipRateLimit,
    tenantRateLimit,
    unauthenticatedIpRateLimit
} = require('../dist/tenant-rate-limit.js');

function invoke(middleware, request) {
    return new Promise((resolve, reject) => {
        const headers = {};
        let statusCode = 200;
        const response = {
            setHeader: (name, value) => { headers[name] = value; },
            status: code => {
                statusCode = code;
                return response;
            },
            json: body => resolve({ headers, statusCode, body })
        };
        middleware(request, response, error => {
            if (error) return reject(error);
            resolve({ headers, statusCode });
        });
    });
}

test('tenant sliding-window rate limiter enforces user and organization budgets', async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    const previousLimit = process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE;
    const originalNow = Date.now;
    let now = originalNow();
    delete process.env.REDIS_URL;
    process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE = '2';
    Date.now = () => now;
    const organizationId = `rate-limit-org-${now}`;

    try {
        const request = userId => ({
            auth: { userId: `rate-limit-user-${userId}`, organizationId }
        });
        assert.equal((await invoke(tenantRateLimit, request('one'))).statusCode, 200);
        assert.equal((await invoke(tenantRateLimit, request('two'))).statusCode, 200);
        const limited = await invoke(tenantRateLimit, request('three'));
        assert.equal(limited.statusCode, 429);
        assert.equal(limited.headers['Retry-After'], '60');
        assert.equal(limited.headers['RateLimit-Limit'], '2');
        assert.equal(limited.headers['X-RateLimit-Remaining'], '0');
        assert.match(limited.body.error, /rate limit/i);
        now += 60_001;
        assert.equal((await invoke(tenantRateLimit, request('four'))).statusCode, 200);
    } finally {
        Date.now = originalNow;
        if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
        else process.env.REDIS_URL = previousRedisUrl;
        if (previousLimit === undefined) delete process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE;
        else process.env.API_RATE_LIMIT_PER_USER_ORG_PER_MINUTE = previousLimit;
    }
});

test('IP sliding-window limiter protects unauthenticated routes and returns usage headers', async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    const previousLimit = process.env.API_RATE_LIMIT_PER_MINUTE;
    const originalNow = Date.now;
    let now = originalNow();
    delete process.env.REDIS_URL;
    process.env.API_RATE_LIMIT_PER_MINUTE = '1';
    Date.now = () => now;
    const request = { ip: `rate-limit-ip-${now}`, socket: { remoteAddress: '127.0.0.1' } };

    try {
        assert.equal((await invoke(ipRateLimit, request)).statusCode, 200);
        const limited = await invoke(ipRateLimit, request);
        assert.equal(limited.statusCode, 429);
        assert.equal(limited.headers['Retry-After'], '60');
        assert.equal(limited.headers['RateLimit-Limit'], '1');
        now += 60_001;
        assert.equal((await invoke(ipRateLimit, request)).statusCode, 200);
    } finally {
        Date.now = originalNow;
        if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
        else process.env.REDIS_URL = previousRedisUrl;
        if (previousLimit === undefined) delete process.env.API_RATE_LIMIT_PER_MINUTE;
        else process.env.API_RATE_LIMIT_PER_MINUTE = previousLimit;
    }
});

test('public unauthenticated routes use their stricter per-IP budget', async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    const previousLimit = process.env.API_RATE_LIMIT_UNAUTHENTICATED_PER_IP_PER_MINUTE;
    delete process.env.REDIS_URL;
    process.env.API_RATE_LIMIT_UNAUTHENTICATED_PER_IP_PER_MINUTE = '1';
    const request = {
        ip: `public-rate-limit-ip-${Date.now()}`,
        socket: { remoteAddress: '127.0.0.1' }
    };

    try {
        assert.equal((await invoke(unauthenticatedIpRateLimit, request)).statusCode, 200);
        const limited = await invoke(unauthenticatedIpRateLimit, request);
        assert.equal(limited.statusCode, 429);
        assert.equal(limited.headers['RateLimit-Limit'], '1');
    } finally {
        if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
        else process.env.REDIS_URL = previousRedisUrl;
        if (previousLimit === undefined) delete process.env.API_RATE_LIMIT_UNAUTHENTICATED_PER_IP_PER_MINUTE;
        else process.env.API_RATE_LIMIT_UNAUTHENTICATED_PER_IP_PER_MINUTE = previousLimit;
    }
});
