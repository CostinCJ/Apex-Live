import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { verifyAccessToken } from './auth.js';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

/**
 * Lightweight WebSocket server for realtime updates.
 * Replaces Supabase Realtime (postgres_changes publication).
 *
 * Usage from API routes: call `broadcast(userId, channel, payload)`
 * to push updates to the connected client.
 */
export class RealtimeService {
  private wss: WebSocketServer;
  private userSockets = new Map<string, Set<AuthenticatedSocket>>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      // Authenticate via query param: ?token=xxx
      const url = new URL(req.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Missing token');
        return;
      }

      try {
        const payload = verifyAccessToken(token);
        ws.userId = payload.sub;
        ws.isAlive = true;

        // Track socket
        if (!this.userSockets.has(payload.sub)) {
          this.userSockets.set(payload.sub, new Set());
        }
        this.userSockets.get(payload.sub)!.add(ws);

        ws.on('pong', () => { ws.isAlive = true; });
        ws.on('close', () => this.removeSocket(ws));
        ws.on('error', (err) => {
          console.error(`WebSocket error for user ${ws.userId}:`, err);
          this.removeSocket(ws);
        });

        ws.send(JSON.stringify({ type: 'connected', userId: payload.sub }));
      } catch {
        ws.close(4001, 'Invalid token');
      }
    });

    // Heartbeat to detect stale connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const sock = ws as AuthenticatedSocket;
        if (!sock.isAlive) {
          sock.terminate();
          return;
        }
        sock.isAlive = false;
        sock.ping();
      });
    }, 30_000);
  }

  /** Send a message to all sockets for a given user */
  broadcast(userId: string, channel: string, payload: unknown): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    const message = JSON.stringify({ type: 'change', channel, payload });
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  private removeSocket(ws: AuthenticatedSocket): void {
    if (ws.userId) {
      const sockets = this.userSockets.get(ws.userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          this.userSockets.delete(ws.userId);
        }
      }
    }
  }

  close(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

// Singleton — initialized in index.ts
export let realtimeService: RealtimeService | null = null;

export function initRealtime(server: Server): RealtimeService {
  realtimeService = new RealtimeService(server);
  return realtimeService;
}
