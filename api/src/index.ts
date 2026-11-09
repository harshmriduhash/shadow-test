import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { billingRouter, stripeWebhookHandler } from './billing';
import { createApiResponseCache } from './cache';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
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
