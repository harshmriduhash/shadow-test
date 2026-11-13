import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';

export const SIMULATION_QUEUE_NAME = 'shadowtest-jobs';

export interface SimulationQueuePayload {
    simulationId: string;
    organizationId: string;
    periodStart: string;
    request: {
        project_id: string;
        project_description: string | null;
        persona_id: string;
        task: string;
        simulation_id: string;
        product_url: string | null;
        repo_url: string | null;
        persona_traits: string;
        persona_profile: {
            technical_knowledge: number;
            patience: number;
            decision_speed: number;
            risk_tolerance: number;
            attention_to_detail: number;
        };
    };
}

let simulationQueue: Queue<SimulationQueuePayload> | undefined;

export function redisConnectionOptions(redisUrl = process.env.REDIS_URL): ConnectionOptions {
    if (!redisUrl) throw new Error('REDIS_URL is required for the durable simulation queue');
    const url = new URL(redisUrl);
    if (!['redis:', 'rediss:'].includes(url.protocol)) {
        throw new Error('REDIS_URL must use the redis or rediss protocol');
    }

    const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;
    if (!Number.isInteger(database) || database < 0) {
        throw new Error('REDIS_URL contains an invalid database number');
    }

    return {
        host: url.hostname,
        port: Number(url.port || 6379),
        ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
        ...(database ? { db: database } : {}),
        ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
        maxRetriesPerRequest: null
    };
}

export function simulationJobOptions(simulationId: string): JobsOptions {
    return {
        jobId: `simulation-${simulationId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 5000
    };
}

export function getSimulationQueue(): Queue<SimulationQueuePayload> {
    if (!simulationQueue) {
        simulationQueue = new Queue<SimulationQueuePayload>(SIMULATION_QUEUE_NAME, {
            connection: redisConnectionOptions()
        });
    }
    return simulationQueue;
}

export async function enqueueSimulation(payload: SimulationQueuePayload): Promise<void> {
    await getSimulationQueue().add('simulation', payload, simulationJobOptions(payload.simulationId));
}

export async function closeSimulationQueue(): Promise<void> {
    if (!simulationQueue) return;
    await simulationQueue.close();
    simulationQueue = undefined;
}
