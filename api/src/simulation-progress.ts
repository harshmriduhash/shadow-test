import { createHash, randomBytes } from 'node:crypto';
import { createRedisClient } from './redis-client';

export interface ProgressTicket {
    simulationId: string;
    organizationId: string;
    userId: string;
}

let redisClient: ReturnType<typeof createRedisClient> | undefined;

async function getRedisClient() {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required for simulation progress');
    if (!redisClient) {
        redisClient = createRedisClient(process.env.REDIS_URL);
        redisClient.on('error', error => console.error('Simulation progress Redis error:', error));
    }
    if (!redisClient.isOpen) await redisClient.connect();
    return redisClient;
}

function ticketKey(ticket: string) {
    return `shadowtest:simulation:progress-ticket:${createHash('sha256').update(ticket).digest('hex')}`;
}

export async function createProgressTicket(payload: ProgressTicket): Promise<string> {
    const client = await getRedisClient();
    const ticket = randomBytes(32).toString('base64url');
    const stored = await client.set(ticketKey(ticket), JSON.stringify(payload), { EX: 30, NX: true });
    if (stored !== 'OK') throw new Error('Unable to issue a simulation progress ticket');
    return ticket;
}

export async function consumeProgressTicket(ticket: string): Promise<ProgressTicket | null> {
    const client = await getRedisClient();
    const value = await client.getDel(ticketKey(ticket));
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (
        typeof parsed !== 'object'
        || parsed === null
        || typeof (parsed as Record<string, unknown>).simulationId !== 'string'
        || typeof (parsed as Record<string, unknown>).organizationId !== 'string'
        || typeof (parsed as Record<string, unknown>).userId !== 'string'
    ) {
        throw new Error('Stored simulation progress ticket is invalid');
    }
    return parsed as ProgressTicket;
}

export async function publishSimulationProgress(simulationId: string, payload: Record<string, unknown>) {
    try {
        const client = await getRedisClient();
        await client.publish(`shadowtest:simulation:${simulationId}:progress`, JSON.stringify(payload));
    } catch (error) {
        console.error(`Unable to publish progress for simulation ${simulationId}:`, error);
    }
}

export async function closeSimulationProgressClient() {
    if (redisClient?.isOpen) await redisClient.quit();
    redisClient = undefined;
}
