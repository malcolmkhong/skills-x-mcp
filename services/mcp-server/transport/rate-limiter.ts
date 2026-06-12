// MCP Server: Rate Limiter
// Token-bucket rate limiting per session

const RATE_LIMIT_AUTHENTICATED = 60;   // requests per minute
const RATE_LIMIT_UNAUTHENTICATED = 10; // requests per minute
const RATE_LIMIT_WINDOW_MS = 60_000;   // 1 minute window

interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();

  check(sessionId: string, isAuthenticated: boolean): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = Date.now();
    const limit = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_UNAUTHENTICATED;
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    let entry = this.entries.get(sessionId);
    if (!entry) {
      entry = { timestamps: [] };
      this.entries.set(sessionId, entry);
    }

    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }

    entry.timestamps.push(now);
    return { allowed: true };
  }

  cleanup(): void {
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [sessionId, entry] of this.entries.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      if (entry.timestamps.length === 0) {
        this.entries.delete(sessionId);
      }
    }
  }
}

export { RATE_LIMIT_AUTHENTICATED, RATE_LIMIT_UNAUTHENTICATED };
