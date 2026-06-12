// IndustryX MCP Server - Skills Provider
// Implements the Model Context Protocol over SSE transport
// This is a SKILLS PROVIDER - other AI agents connect here to access knowledge
// Enhanced: API key authentication, rate limiting, usage tracking

import { MCP_TOOLS, executeTool } from './tools';
import { healthCheck, validateApiKey, trackUsage, type AuthContext } from './api-client';

// ─── Configuration ───────────────────────────────────────────────────────────
const PORT = 3002;
const SERVER_NAME = 'industryx-knowledge-provider';
const SERVER_VERSION = '1.1.0';

// Rate limits
const RATE_LIMIT_AUTHENTICATED = 60;  // requests per minute
const RATE_LIMIT_UNAUTHENTICATED = 10; // requests per minute
const RATE_LIMIT_WINDOW_MS = 60_000;   // 1 minute window

// ─── Types ───────────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[]; // timestamps of requests in the current window
}

class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if a session is rate limited.
   * Returns { allowed: true } or { allowed: false, retryAfterMs }
   */
  check(sessionId: string, isAuthenticated: boolean): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = Date.now();
    const limit = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_UNAUTHENTICATED;
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    let entry = this.entries.get(sessionId);
    if (!entry) {
      entry = { timestamps: [] };
      this.entries.set(sessionId, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= limit) {
      // Calculate when the oldest request in the window will expire
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }

    // Record this request
    entry.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Clean up stale entries (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    for (const [sessionId, entry] of this.entries.entries()) {
      // Remove old timestamps
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      // Remove empty entries
      if (entry.timestamps.length === 0) {
        this.entries.delete(sessionId);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Clean up rate limit entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60_000);

// ─── SSE Connection Manager ─────────────────────────────────────────────────

interface SSEConnection {
  controller: ReadableStreamDefaultController;
  keepalive: ReturnType<typeof setInterval>;
  authContext: AuthContext | null; // Auth info for this session
}

class SSEConnectionManager {
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

const sseManager = new SSEConnectionManager();

// ─── Authentication ─────────────────────────────────────────────────────────

/**
 * Extract API key from various sources:
 * 1. URL query parameter: ?apiKey=ixk_xxxxx
 * 2. Authorization header: Bearer ixk_xxxxx
 */
function extractApiKey(req: Request, url: URL): string | null {
  // Check URL query parameter first
  const queryApiKey = url.searchParams.get('apiKey');
  if (queryApiKey) return queryApiKey;

  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }

  return null;
}

/**
 * Validate an API key and return the auth context.
 * Returns null if no key provided or validation failed.
 */
async function authenticate(apiKey: string | null): Promise<AuthContext | null> {
  if (!apiKey) return null;

  // Basic format check before making the API call
  if (!/^ixk_[0-9a-f]{16,}$/.test(apiKey)) {
    console.log('[Auth] Invalid API key format, skipping validation');
    return null;
  }

  const result = await validateApiKey(apiKey);

  if (!result.valid) {
    console.log(`[Auth] API key validation failed: ${result.error}`);
    return null;
  }

  return {
    apiKey,
    userId: result.userId!,
    apiKeyId: result.apiKeyId!,
    permissions: result.permissions!,
    plan: result.plan!,
    workspaceId: result.workspaceId ?? null,
    rateLimit: result.rateLimit!,
    monthlyLimit: result.monthlyLimit!,
    monthlyUsage: result.monthlyUsage!,
  };
}

// ─── JSON-RPC Message Handling ───────────────────────────────────────────────

function createResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function createError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

async function handleJsonRpc(
  request: JsonRpcRequest,
  authContext: AuthContext | null,
  sessionId: string
): Promise<JsonRpcResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        return createResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
        });
      }

      case 'notifications/initialized': {
        if (id !== undefined && id !== null) {
          return createResponse(id, {});
        }
        return createResponse(null, {});
      }

      case 'tools/list': {
        return createResponse(id, {
          tools: MCP_TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
      }

      case 'tools/call': {
        const toolName = params?.name as string;
        const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};

        if (!toolName) {
          return createError(id, -32602, 'Missing required parameter: name');
        }

        const toolExists = MCP_TOOLS.some((t) => t.name === toolName);
        if (!toolExists) {
          return createError(
            id,
            -32601,
            `Unknown tool: ${toolName}. Available tools: ${MCP_TOOLS.map((t) => t.name).join(', ')}`
          );
        }

        // Rate limit check
        const isAuthenticated = authContext !== null;
        const rateCheck = rateLimiter.check(sessionId, isAuthenticated);
        if (!rateCheck.allowed) {
          console.log(`[Rate Limit] Session ${sessionId} rate limited. Retry after ${rateCheck.retryAfterMs}ms`);
          return createError(
            id,
            -32029,
            `Rate limit exceeded. Maximum ${isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_UNAUTHENTICATED} requests per minute. Retry after ${Math.ceil(rateCheck.retryAfterMs / 1000)} seconds.`,
            { retryAfterMs: rateCheck.retryAfterMs }
          );
        }

        const authLabel = authContext
          ? `userId: ${authContext.userId} (${authContext.plan})`
          : 'unauthenticated';
        console.log(`[Tool] Calling: ${toolName} | Session: ${sessionId} | Auth: ${authLabel}`);
        const startTime = Date.now();

        const result = await executeTool(toolName, toolArgs, authContext);

        const duration = Date.now() - startTime;
        const resultText = result.content[0]?.text ?? '';
        const isResultError = resultText.startsWith('Error') || resultText.startsWith('Permission denied');
        console.log(`[Tool] Completed: ${toolName} | Duration: ${duration}ms | Success: ${!isResultError}`);

        // Track usage for unauthenticated users too (for monitoring)
        if (!authContext) {
          trackUsage({
            userId: 'anonymous',
            eventType: 'mcp_call',
            toolName,
            query: (toolArgs.query as string) ?? undefined,
            durationMs: duration,
            success: !isResultError,
            errorMessage: isResultError ? resultText.substring(0, 200) : undefined,
          });
        }

        return createResponse(id, result);
      }

      case 'ping': {
        return createResponse(id, {});
      }

      default: {
        return createError(id, -32601, `Method not found: ${method}`);
      }
    }
  } catch (error) {
    console.error(`[RPC Error] Method: ${method}`, error);
    return createError(id, -32603, `Internal error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── SSE Endpoint: /sse ────────────────────────────────────────
    if (url.pathname === '/sse' && req.method === 'GET') {
      const sessionId = generateSessionId();
      const encoder = new TextEncoder();

      // Authenticate the SSE connection
      const apiKey = extractApiKey(req, url);
      const authContext = await authenticate(apiKey);

      let closed = false;

      const stream = new ReadableStream({
        start(controller) {
          const endpointEvent = `event: endpoint\ndata: /messages?sessionId=${sessionId}\n\n`;
          controller.enqueue(encoder.encode(endpointEvent));

          const keepalive = setInterval(() => {
            if (closed) {
              clearInterval(keepalive);
              return;
            }
            try {
              controller.enqueue(encoder.encode(': keepalive\n\n'));
            } catch {
              clearInterval(keepalive);
              sseManager.removeConnection(sessionId);
            }
          }, 15000);

          sseManager.addConnection(sessionId, controller, keepalive, authContext);
        },
        cancel() {
          closed = true;
          sseManager.removeConnection(sessionId);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          ...corsHeaders,
        },
      });
    }

    // ─── Messages Endpoint: /messages ──────────────────────────────
    if (url.pathname === '/messages' && req.method === 'POST') {
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Missing sessionId query parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Get auth context from the SSE session (set during SSE connection)
      let authContext = sseManager.getAuthContext(sessionId);

      // Also check Authorization header on the messages endpoint
      // This allows authenticating per-request if no session auth exists
      if (!authContext) {
        const headerApiKey = extractApiKey(req, url);
        if (headerApiKey) {
          authContext = await authenticate(headerApiKey);
          // Update the session's auth context if we just authenticated
          // (This allows "upgrading" an unauthenticated session)
          if (authContext) {
            const conn = (sseManager as unknown as { connections: Map<string, SSEConnection> }).connections.get(sessionId);
            if (conn) {
              conn.authContext = authContext;
              console.log(`[Auth] Session ${sessionId} upgraded to authenticated (userId: ${authContext.userId})`);
            }
          }
        }
      }

      let body: JsonRpcRequest;
      try {
        body = (await req.json()) as JsonRpcRequest;
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (body.jsonrpc !== '2.0') {
        const errorResponse = createError(null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
        return new Response(JSON.stringify(errorResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const response = await handleJsonRpc(body, authContext, sessionId);

      // Also send via SSE if it's a tool call
      if (body.method === 'tools/call' && sessionId) {
        sseManager.sendMessage(sessionId, JSON.stringify(response));
      }

      if (body.id !== undefined && body.id !== null) {
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(null, { status: 202, headers: corsHeaders });
    }

    // ─── Health Check: /health ─────────────────────────────────────
    if (url.pathname === '/health') {
      let apiHealthy = false;
      try {
        apiHealthy = await healthCheck();
      } catch {
        apiHealthy = false;
      }

      return new Response(
        JSON.stringify({
          status: apiHealthy ? 'healthy' : 'degraded',
          server: SERVER_NAME,
          version: SERVER_VERSION,
          role: 'skills-provider',
          description: 'MCP Skills Provider for IndustryX Knowledge Base. Connect your AI agent to access skills, SOPs, architecture docs, and more.',
          apiConnection: apiHealthy ? 'connected' : 'disconnected',
          activeSSEConnections: sseManager.getConnectionCount(),
          authenticatedConnections: sseManager.getAuthenticatedCount(),
          rateLimits: {
            authenticated: `${RATE_LIMIT_AUTHENTICATED}/min`,
            unauthenticated: `${RATE_LIMIT_UNAUTHENTICATED}/min`,
          },
          authentication: {
            methods: ['API key via SSE query (?apiKey=ixk_xxxxx)', 'Bearer token in Authorization header'],
            unauthenticatedAccess: 'Read-only with stricter rate limiting',
          },
          tools: MCP_TOOLS.map((t) => t.name),
          mcpConfig: {
            transport: 'SSE',
            sseEndpoint: '/sse',
            messagesEndpoint: '/messages',
            protocolVersion: '2024-11-05',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ─── Root: Server info ─────────────────────────────────────────
    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({
          name: SERVER_NAME,
          version: SERVER_VERSION,
          role: 'skills-provider',
          description: 'IndustryX Knowledge MCP Server - A Skills Provider for AI Agents',
          howToConnect: {
            claudeCode: 'Add to your claude_desktop_config.json: { "mcpServers": { "industryx": { "url": "http://<host>:3002/sse?apiKey=ixk_your_api_key" } } }',
            cursor: 'Add to your MCP settings with SSE transport pointing to /sse endpoint (with optional ?apiKey= parameter)',
            generic: 'Connect via SSE to /sse?apiKey=ixk_your_key, send JSON-RPC messages to /messages?sessionId=<id>',
            unauthenticated: 'Connect via SSE to /sse without an API key for read-only access with limited rate',
          },
          authentication: {
            methods: [
              'API key in SSE URL query: /sse?apiKey=ixk_xxxxx',
              'Authorization header on /messages: Bearer ixk_xxxxx',
            ],
            unauthenticated: {
              access: 'Read-only tools (search, retrieve, context)',
              rateLimit: `${RATE_LIMIT_UNAUTHENTICATED} requests/minute`,
            },
            authenticated: {
              access: 'All tools based on API key permissions',
              rateLimit: `${RATE_LIMIT_AUTHENTICATED} requests/minute`,
            },
          },
          protocol: 'Model Context Protocol (SSE transport)',
          protocolVersion: '2024-11-05',
          endpoints: {
            sse: '/sse',
            messages: '/messages',
            health: '/health',
          },
          tools: MCP_TOOLS.map((t) => ({
            name: t.name,
            description: t.description.split('.')[0] + '.',
          })),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ─── 404 ───────────────────────────────────────────────────────
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
});

console.log('');
console.log('===============================================================');
console.log(`  ${SERVER_NAME} v${SERVER_VERSION}`);
console.log('  IndustryX Knowledge Skills Provider');
console.log('===============================================================');
console.log(`  Server running on http://localhost:${PORT}`);
console.log(`  SSE endpoint:   http://localhost:${PORT}/sse`);
console.log(`  Messages:       http://localhost:${PORT}/messages`);
console.log(`  Health check:   http://localhost:${PORT}/health`);
console.log('');
console.log(`  ${MCP_TOOLS.length} MCP tools available:`);
MCP_TOOLS.forEach((tool) => {
  console.log(`    - ${tool.name}`);
});
console.log('');
console.log(`  API Base URL:   ${process.env.API_BASE_URL || 'http://localhost:3000'}`);
console.log('');
console.log('  Authentication:');
console.log('    - API key in SSE query: /sse?apiKey=ixk_xxxxx');
console.log('    - Bearer token in Authorization header');
console.log('    - Unauthenticated: read-only access');
console.log('');
console.log('  Rate Limits:');
console.log(`    - Authenticated:   ${RATE_LIMIT_AUTHENTICATED} req/min`);
console.log(`    - Unauthenticated: ${RATE_LIMIT_UNAUTHENTICATED} req/min`);
console.log('');
console.log('  Connect your AI agent via MCP SSE transport:');
console.log('    Claude Code: Add to claude_desktop_config.json');
console.log('    Cursor:      Add to MCP settings');
console.log('===============================================================');
console.log('');
