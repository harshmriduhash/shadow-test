const test = require('node:test');
const assert = require('node:assert/strict');
const {
    redisConnectionOptions,
    SIMULATION_QUEUE_NAME,
    simulationJobOptions
} = require('../dist/simulation-queue.js');

test('BullMQ queue name is valid and shared with the Python worker', () => {
    assert.equal(SIMULATION_QUEUE_NAME, 'shadowtest-jobs');
    assert.equal(SIMULATION_QUEUE_NAME.includes(':'), false);
});

test('BullMQ connection options preserve Redis TLS, authentication, and database settings', () => {
    assert.deepEqual(
        redisConnectionOptions('rediss://user:secret%40pass@redis.example.test:6380/2'),
        {
            host: 'redis.example.test',
            port: 6380,
            username: 'user',
            password: 'secret@pass',
            db: 2,
            tls: {},
            maxRetriesPerRequest: null
        }
    );
    assert.throws(() => redisConnectionOptions('http://redis.example.test'), /redis or rediss/);
    assert.throws(() => redisConnectionOptions('redis://redis.example.test/not-a-db'), /database number/);
});

test('simulation jobs are idempotent and retry with exponential backoff', () => {
    assert.deepEqual(simulationJobOptions('simulation-123'), {
        jobId: 'simulation-simulation-123',
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 5000
    });
});
