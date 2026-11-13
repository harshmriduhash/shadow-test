const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../dist/index.js');

test('Stripe webhook route receives the raw request body before JSON parsing', async t => {
    const previousSecretKey = process.env.STRIPE_SECRET_KEY;
    const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_shadowtest';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_shadowtest';

    const server = app.listen(0);
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        if (previousSecretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
        else process.env.STRIPE_SECRET_KEY = previousSecretKey;
        if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
        else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
    });

    await new Promise(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(`http://127.0.0.1:${address.port}/api/billing/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': 'invalid'
        },
        body: JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated' })
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid Stripe webhook signature.' });

    const versionedResponse = await fetch(`http://127.0.0.1:${address.port}/api/v1/webhooks/stripe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': 'invalid'
        },
        body: JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated' })
    });
    const versionedBody = await versionedResponse.json();
    assert.equal(versionedResponse.status, 400);
    assert.equal(versionedBody.error.message, 'Invalid Stripe webhook signature.');
    assert.equal(versionedBody.error.requestId, versionedResponse.headers.get('x-request-id'));
});
