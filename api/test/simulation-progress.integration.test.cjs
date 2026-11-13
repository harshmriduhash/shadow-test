const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const { WebSocket } = require('ws');
const { attachSimulationWebSocket } = require('../dist/simulation-websocket.js');
const {
    closeSimulationProgressClient,
    createProgressTicket,
    publishSimulationProgress
} = require('../dist/simulation-progress.js');

test('one-time progress tickets authorize live events and reject replay', {
    skip: !process.env.REDIS_URL
}, async t => {
    const origin = 'https://app.example.test';
    const simulationId = `integration-simulation-${randomUUID()}`;
    const server = createServer();
    const webSockets = attachSimulationWebSocket(server, [origin]);
    const clients = new Set();
    t.after(async () => {
        for (const client of clients) client.close();
        await new Promise(resolve => webSockets.close(resolve));
        await new Promise(resolve => server.close(resolve));
        await closeSimulationProgressClient();
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const ticket = await createProgressTicket({
        simulationId,
        organizationId: 'integration-org',
        userId: 'integration-user'
    });
    const socket = new WebSocket(
        `ws://127.0.0.1:${address.port}/api/v1/simulations/${encodeURIComponent(simulationId)}/progress?ticket=${ticket}`,
        { headers: { Origin: origin } }
    );
    clients.add(socket);
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });

    const received = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out waiting for simulation progress')), 5000);
        socket.once('message', data => {
            clearTimeout(timer);
            resolve(JSON.parse(String(data)));
        });
    });
    await new Promise(resolve => setTimeout(resolve, 150));
    await publishSimulationProgress(simulationId, {
        type: 'simulation.status',
        status: 'RUNNING'
    });
    assert.deepEqual(await received, {
        type: 'simulation.status',
        status: 'RUNNING'
    });
    socket.close();

    const replay = new WebSocket(
        `ws://127.0.0.1:${address.port}/api/v1/simulations/${encodeURIComponent(simulationId)}/progress?ticket=${ticket}`,
        { headers: { Origin: origin } }
    );
    clients.add(replay);
    const rejectedStatus = await new Promise((resolve, reject) => {
        replay.once('unexpected-response', (_request, response) => resolve(response.statusCode));
        replay.once('error', error => reject(error));
    });
    assert.equal(rejectedStatus, 401);
});
