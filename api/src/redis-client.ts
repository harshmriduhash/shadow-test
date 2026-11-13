import { createClient } from 'redis';

export function createRedisClient(url: string) {
    return createClient({
        url,
        socket: {
            connectTimeout: 5000,
            reconnectStrategy(retries) {
                if (retries >= 3) return new Error('Redis reconnect attempts exceeded');
                return Math.min((retries + 1) * 200, 1000);
            }
        }
    });
}
