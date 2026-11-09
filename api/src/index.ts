import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';
import { billingRouter, stripeWebhookHandler } from './billing';
import { createApiResponseCache } from './cache';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const readinessPrisma = new PrismaClient();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const redisClient = process.env.REDIS_URL ? createClient({ url: process.env.REDIS_URL }) : undefined;

redisClient?.on('error', error => console.error('Redis connection error:', error));

app.set('trust proxy', 1);
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));
const apiRateLimit = rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 120),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(redisClient ? {
        store: new RedisStore({
            sendCommand: (...args: string[]) => redisClient.sendCommand(args)
        })
    } : {})
});

app.post('/api/billing/webhook', apiRateLimit, express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(express.json({ limit: '1mb' }));
app.use(apiRateLimit);
app.use('/api', createApiResponseCache(redisClient));

app.use('/api', apiRoutes);
app.use('/api/billing', billingRouter);

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
                    ) AS "simulationEvents"
            `;
            if (!schema[0]?.personaProfile || !schema[0]?.simulationEvents) {
                throw new Error('Required Prisma migrations have not been applied');
            }
        }),
        check('redis', async () => {
            if (!redisClient?.isReady) throw new Error('Redis is not connected');
            await redisClient.ping();
        }),
        check('worker', async () => {
            if (!redisClient?.isReady) throw new Error('Redis is not connected');
            const heartbeat = await redisClient.exists('shadowtest:worker:heartbeat');
            if (!heartbeat) throw new Error('Simulation worker heartbeat is unavailable');
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
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

if (require.main === module) {
    void startServer().catch(error => {
        console.error('Failed to start ShadowTest API:', error);
        process.exitCode = 1;
    });
}

export { app };
