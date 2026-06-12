// MCP Server: SSE Connection Manager
// Manages Server-Sent Events connections for MCP transport

import { type AuthContext } from '../api-client';

export interface SSEConnection {
  controller: ReadableStreamDefaultController;
  keepalive: ReturnType<typeof setInterval>;
  authContext: AuthContext | null;
}

export class SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map();

  addConnection(
    sessionId: string,
    controller: ReadableStreamDefaultController,
    keepalive: ReturnType<typeof setInterval>,
    authContext: AuthContext | null
  ): void {
    this.connections.set(sessionId, { controller, keepalive, authContext });
    const authInfo = authContext
      ? `authenticated (userId: ${authContext.userId}, plan: ${authContext.plan})`
      : 'unauthenticated (read-only)';
    console.log(`[SSE] Client connected: ${sessionId} - ${authInfo} (total: ${this.connections.size})`);
  }

  removeConnection(sessionId: string): void {
    const conn = this.connections.get(sessionId);
    if (conn) {
      clearInterval(conn.keepalive);
    }
    this.connections.delete(sessionId);
    console.log(`[SSE] Client disconnected: ${sessionId} (total: ${this.connections.size})`);
  }

  sendMessage(sessionId: string, data: string): boolean {
    const conn = this.connections.get(sessionId);
    if (!conn) return false;

    try {
      const encoder = new TextEncoder();
      conn.controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
      return true;
    } catch {
      this.removeConnection(sessionId);
      return false;
    }
  }

  getAuthContext(sessionId: string): AuthContext | null {
    return this.connections.get(sessionId)?.authContext ?? null;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getAuthenticatedCount(): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.authContext) count++;
    }
    return count;
  }
}
