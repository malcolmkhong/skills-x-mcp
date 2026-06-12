// IndustryX MCP Server — Skills Provider
// Implements the Model Context Protocol over SSE transport
// AI agents connect here to access the knowledge base

import { MCP_TOOLS, executeTool } from './tools';
import { checkPermission } from './tools/shared';
import { healthCheck, trackUsage, type AuthContext } from './api-client';
import { extractApiKey, authenticate } from './auth';
import { RateLimiter, RATE_LIMIT_AUTHENTICATED, RATE_LIMIT_UNAUTHENTICATED } from './transport/rate-limiter';
import { SSEConnectionManager } from './transport/sse-manager';

// ─── Configuration ───────────────────────────────────────────────────────────
const PORT = 3002;
const SERVER_NAME = 'industryx-knowledge-provider';
const SERVER_VERSION = '1.1.0';

const rateLimiter = new RateLimiter();
const sseManager = new SSEConnectionManager();

// Clean up rate limit entries every 5 minutes
setInterval(() => { rateLimiter.cleanup(); }, 5 * 60_000);

// ─── JSON-RPC Message Handling ───────────────────────────────────────────────

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
  error?: { code: number; message: string; data?: unknown };
}

function createResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function createError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
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
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        });
      }

      case 'notifications/initialized': {
        return createResponse(id ?? null, {});
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
          return createError(id, -32601, `Unknown tool: ${toolName}. Available tools: ${MCP_TOOLS.map((t) => t.name).join(', ')}`);
        }

        // Rate limit check
        const isAuthenticated = authContext !== null;
        const rateCheck = rateLimiter.check(sessionId, isAuthenticated);
        if (!rateCheck.allowed) {
          return createError(id, -32029, `Rate limit exceeded. Maximum ${isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_UNAUTHENTICATED} requests per minute. Retry after ${Math.ceil(rateCheck.retryAfterMs / 1000)} seconds.`, { retryAfterMs: rateCheck.retryAfterMs });
        }

        const authLabel = authContext ? `userId: ${authContext.userId} (${authContext.plan})` : 'unauthenticated';
        console.log(`[Tool] Calling: ${toolName} | Session: ${sessionId} | Auth: ${authLabel}`);
        const startTime = Date.now();

        const result = await executeTool(toolName, toolArgs, authContext);

        const duration = Date.now() - startTime;
        const resultText = result.content[0]?.text ?? '';
        const isResultError = resultText.startsWith('Error') || resultText.startsWith('Permission denied');
        console.log(`[Tool] Completed: ${toolName} | Duration: ${duration}ms | Success: ${!isResultError}`);

        // Track usage for unauthenticated users too
        if (!authContext) {
          trackUsage({ userId: 'anonymous', eventType: 'mcp_call', toolName, query: (toolArgs.query as string) ?? undefined, durationMs: duration, success: !isResultError, errorMessage: isResultError ? resultText.substring(0, 200) : undefined });
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
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── SSE Endpoint ─────────────────────────────────────────────────
    if (url.pathname === '/sse' && req.method === 'GET') {
      const sessionId = generateSessionId();
      const encoder = new TextEncoder();
      const apiKey = extractApiKey(req, url);
      const authContext = await authenticate(apiKey);
      let closed = false;

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`event: endpoint\ndata: /messages?sessionId=${sessionId}\n\n`));
          const keepalive = setInterval(() => {
            if (closed) { clearInterval(keepalive); return; }
            try { controller.enqueue(encoder.encode(': keepalive\n\n')); }
            catch { clearInterval(keepalive); sseManager.removeConnection(sessionId); }
          }, 15000);
          sseManager.addConnection(sessionId, controller, keepalive, authContext);
        },
        cancel() { closed = true; sseManager.removeConnection(sessionId); },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', ...corsHeaders },
      });
    }

    // ─── Messages Endpoint ────────────────────────────────────────────
    if (url.pathname === '/messages' && req.method === 'POST') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      let authContext = sseManager.getAuthContext(sessionId);
      if (!authContext) {
        const headerApiKey = extractApiKey(req, url);
        if (headerApiKey) {
          authContext = await authenticate(headerApiKey);
          if (authContext) {
            const conn = (sseManager as unknown as { connections: Map<string, import('./transport/sse-manager').SSEConnection> }).connections.get(sessionId);
            if (conn) { conn.authContext = authContext; console.log(`[Auth] Session ${sessionId} upgraded to authenticated (userId: ${authContext.userId})`); }
          }
        }
      }

      let body: JsonRpcRequest;
      try { body = (await req.json()) as JsonRpcRequest; }
      catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }); }

      if (body.jsonrpc !== '2.0') {
        return new Response(JSON.stringify(createError(null, -32600, 'Invalid Request: jsonrpc must be "2.0"')), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      const response = await handleJsonRpc(body, authContext, sessionId);

      if (body.method === 'tools/call' && sessionId) {
        sseManager.sendMessage(sessionId, JSON.stringify(response));
      }

      if (body.id !== undefined && body.id !== null) {
        return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      return new Response(null, { status: 202, headers: corsHeaders });
    }

    // ─── Health Check ─────────────────────────────────────────────────
    if (url.pathname === '/health') {
      let apiHealthy = false;
      try { apiHealthy = await healthCheck(); } catch { apiHealthy = false; }

      return new Response(JSON.stringify({
        status: apiHealthy ? 'healthy' : 'degraded',
        server: SERVER_NAME,
        version: SERVER_VERSION,
        role: 'skills-provider',
        apiConnection: apiHealthy ? 'connected' : 'disconnected',
        activeSSEConnections: sseManager.getConnectionCount(),
        authenticatedConnections: sseManager.getAuthenticatedCount(),
        rateLimits: { authenticated: `${RATE_LIMIT_AUTHENTICATED}/min`, unauthenticated: `${RATE_LIMIT_UNAUTHENTICATED}/min` },
        tools: MCP_TOOLS.map((t) => t.name),
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // ─── Root: Server info ────────────────────────────────────────────
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        role: 'skills-provider',
        description: 'IndustryX Knowledge MCP Server — Skills Provider for AI Agents',
        tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description.split('.')[0] + '.' })),
        endpoints: { sse: '/sse', messages: '/messages', health: '/health' },
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  },
});

console.log('');
console.log('===============================================================');
console.log(`  ${SERVER_NAME} v${SERVER_VERSION}`);
console.log('  IndustryX Knowledge Skills Provider');
console.log('===============================================================');
console.log(`  Server running on http://localhost:${PORT}`);
console.log(`  SSE:   http://localhost:${PORT}/sse`);
console.log(`  Health: http://localhost:${PORT}/health`);
console.log('');
console.log(`  ${MCP_TOOLS.length} MCP tools available:`);
MCP_TOOLS.forEach((tool) => { console.log(`    - ${tool.name}`); });
console.log('');
console.log(`  API Base: ${process.env.API_BASE_URL || 'http://localhost:3000'}`);
console.log('===============================================================');
