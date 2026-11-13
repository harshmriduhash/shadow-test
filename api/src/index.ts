import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createRedisClient } from './redis-client';
import { isAllowedOrigin, parseAllowedOrigins, securityHeaders } from './http-security';
import { closeSimulationQueue, getSimulationQueue } from './simulation-queue';
import { closeSimulationProgressClient } from './simulation-progress';
import { attachSimulationWebSocket } from './simulation-websocket';
import { closeRateLimitClient, ipRateLimit } from './tenant-rate-limit';
import { billingRouter, stripeWebhookHandler } from './billing';
import { createApiResponseCache } from './cache';
import { requestContext, versionedApiEnvelope } from './request-context';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const readinessPrisma = new PrismaClient();
const server = createServer(app);
const allowedOrigins = parseAllowedOrigins(
    process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS,
    process.env.NODE_ENV === 'production'
);
const redisClient = process.env.REDIS_URL ? createRedisClient(process.env.REDIS_URL) : undefined;
const progressWebSockets = attachSimulationWebSocket(server, allowedOrigins);

redisClient?.on('error', error => console.error('Redis connection error:', error));

app.set('trust proxy', 1);
app.use(requestContext);
app.use('/api/v1', versionedApiEnvelope);
app.use(securityHeaders);
app.use((req, res, next) => {
    if (!isAllowedOrigin(req, allowedOrigins)) {
        return res.status(403).json({ error: 'Origin is not allowed' });
    }
    next();
});
app.use(cors({
    origin(origin, callback) {
        return callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true
}));
app.post('/api/billing/webhook', ipRateLimit, express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.post('/api/v1/webhooks/stripe', ipRateLimit, express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(express.json({ limit: '1mb' }));
app.use(ipRateLimit);
app.use('/api', createApiResponseCache(redisClient));

app.use('/api/v1/billing', billingRouter);
app.use('/api/v1', apiRoutes);
app.use('/api/v1', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found' } });
});
app.use('/api/billing', billingRouter);
app.use('/api', apiRoutes);

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'ShadowTest API' });
});

app.get('/health/ready', async (_req, res) => {
    const checks: Record<string, boolean> = {
        database: false,
        redis: false,
        worker: false,
        clerk: false,
        aiEngine: false,
        s3: false,
        qdrant: false
    };
    const check = async (name: string, operation: () => Promise<void>) => {
        try {
            await operation();
            checks[name] = true;
        } catch (error) {
            console.error(`Readiness check failed for ${name}:`, error);
        }
    };

    await Promise.all([
        check('database', async () => {
            await readinessPrisma.$queryRaw`SELECT 1`;
            const schema = await readinessPrisma.$queryRaw<Array<{
                personaProfile: boolean;
                simulationEvents: boolean;
                reportShares: boolean;
            }>>`
                SELECT
                    EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'Persona'
                          AND column_name = 'technical_knowledge'
                    ) AS "personaProfile",
                    EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = current_schema()
                          AND table_name = 'SimulationEvent'
                    ) AS "simulationEvents",
                    EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = current_schema()
                          AND table_name = 'ReportShare'
                    ) AS "reportShares"
            `;
            if (!schema[0]?.personaProfile || !schema[0]?.simulationEvents || !schema[0]?.reportShares) {
                throw new Error('Required Prisma migrations have not been applied');
            }
        }),
        check('redis', async () => {
            if (!redisClient?.isReady) throw new Error('Redis is not connected');
            await redisClient.ping();
        }),
        check('worker', async () => {
            if (!redisClient?.isReady) throw new Error('Redis is not connected');
            let cursor = '0';
            let hasWorker = false;
            do {
                const result = await redisClient.scan(cursor, {
                    MATCH: 'shadowtest:worker:heartbeat:*',
                    COUNT: 100
                });
                cursor = result.cursor;
                hasWorker = result.keys.length > 0;
            } while (cursor !== '0' && !hasWorker);
            if (!hasWorker) {
                hasWorker = (await redisClient.exists('shadowtest:worker:heartbeat')) > 0;
            }
            if (!hasWorker) throw new Error('Simulation worker heartbeat is unavailable');
            await getSimulationQueue().getJobCounts('waiting', 'active', 'delayed', 'failed');
        }),
        check('clerk', async () => {
            const jwksUrl = process.env.CLERK_JWKS_URL
                || (process.env.CLERK_ISSUER_URL
                    ? `${process.env.CLERK_ISSUER_URL.replace(/\/$/, '')}/.well-known/jwks.json`
                    : undefined);
            if (!jwksUrl) throw new Error('Clerk issuer/JWKS URL is not configured');
            const response = await fetch(jwksUrl, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error('Clerk JWKS endpoint is unavailable');
            const payload: { keys?: unknown } = await response.json();
            if (!Array.isArray(payload.keys) || payload.keys.length === 0) throw new Error('Clerk JWKS response has no keys');
        }),
        check('aiEngine', async () => {
            const engineUrl = process.env.AI_ENGINE_URL;
            if (!engineUrl || !process.env.INTERNAL_API_KEY) throw new Error('AI service configuration is incomplete');
            const response = await fetch(`${engineUrl}/health/ready`, { signal: AbortSignal.timeout(10_000) });
            if (!response.ok) throw new Error('AI service readiness endpoint is unavailable');
            const payload: {
                ready?: boolean;
                features?: { s3?: boolean; qdrant?: boolean };
            } = await response.json();
            checks.s3 = payload.features?.s3 === true;
            checks.qdrant = payload.features?.qdrant === true;
            if (!payload.ready) throw new Error('AI service dependencies are not ready');
        })
    ]);

    const ready = Object.values(checks).every(Boolean);
    res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'degraded',
        service: 'ShadowTest API',
        ready,
        checks
    });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred' });
});

async function startServer() {
    if (process.env.NODE_ENV === 'production' && !redisClient) {
        throw new Error('REDIS_URL is required in production for shared rate limiting');
    }
    if (redisClient) await redisClient.connect();
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    const shutdown = () => {
        for (const client of progressWebSockets.clients) {
            client.close(1001, 'Server shutting down');
        }
        progressWebSockets.close();
        server.close(() => {
            void Promise.all([
                closeSimulationQueue(),
                closeSimulationProgressClient(),
                closeRateLimitClient(),
                readinessPrisma.$disconnect(),
                redisClient?.quit()
            ]).catch(error => {
                console.error('Failed to close API resources cleanly:', error);
                process.exitCode = 1;
            });
        });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}

if (require.main === module) {
    void startServer().catch(error => {
        console.error('Failed to start ShadowTest API:', error);
        process.exitCode = 1;
    });
}

export { app };
