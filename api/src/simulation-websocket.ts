import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { consumeProgressTicket } from './simulation-progress';
import { createRedisClient } from './redis-client';

function rejectUpgrade(socket: import('node:stream').Duplex, statusCode: number, message: string) {
    socket.write(`HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
}

function allowedOrigin(request: IncomingMessage, allowedOrigins: string[]) {
    const origin = request.headers.origin;
    return typeof origin === 'string' && allowedOrigins.includes(origin);
}

export function attachSimulationWebSocket(server: Server, allowedOrigins: string[]) {
    const webSockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url || '/', 'http://localhost');
        const match = url.pathname.match(/^\/api\/v1\/simulations\/([^/]+)\/progress$/);
        if (!match) return rejectUpgrade(socket, 404, 'Not Found');
        if (!allowedOrigin(request, allowedOrigins)) return rejectUpgrade(socket, 403, 'Forbidden');
        const ticket = url.searchParams.get('ticket');
        if (!ticket || ticket.length > 128) return rejectUpgrade(socket, 401, 'Unauthorized');

        void consumeProgressTicket(ticket).then(progressTicket => {
            const simulationId = decodeURIComponent(match[1]);
            if (!progressTicket || progressTicket.simulationId !== simulationId) {
                return rejectUpgrade(socket, 401, 'Unauthorized');
            }

            webSockets.handleUpgrade(request, socket, head, client => {
                void streamSimulationEvents(client, simulationId);
            });
        }).catch(error => {
            console.error('Unable to authorize simulation progress WebSocket:', error);
            rejectUpgrade(socket, 503, 'Service Unavailable');
        });
    });

    return webSockets;
}

async function streamSimulationEvents(client: WebSocket, simulationId: string) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        client.close(1011, 'Progress service unavailable');
        return;
    }

    const subscriber = createRedisClient(redisUrl);
    subscriber.on('error', error => console.error('Simulation progress subscriber error:', error));
    try {
        await subscriber.connect();
        await subscriber.subscribe(`shadowtest:simulation:${simulationId}:progress`, message => {
            if (client.readyState === WebSocket.OPEN) client.send(message);
        });
    } catch (error) {
        console.error(`Unable to subscribe to simulation ${simulationId} progress:`, error);
        client.close(1011, 'Progress service unavailable');
        await subscriber.quit().catch(closeError => {
            console.error('Unable to close simulation progress subscriber:', closeError);
        });
        return;
    }

    client.once('close', () => {
        void subscriber.quit().catch(error => {
            console.error('Unable to close simulation progress subscriber:', error);
        });
    });
}
