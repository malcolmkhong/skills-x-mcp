// IndustryX MCP Server - Skills Provider
// Implements the Model Context Protocol over SSE transport
// This is a SKILLS PROVIDER - other AI agents connect here to access knowledge

import { MCP_TOOLS, executeTool } from './tools';
import { healthCheck } from './api-client';

// ─── Configuration ───────────────────────────────────────────────────────────
const PORT = 3002;
const SERVER_NAME = 'industryx-knowledge-provider';
const SERVER_VERSION = '1.0.0';

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

// ─── SSE Connection Manager ─────────────────────────────────────────────────

interface SSEConnection {
  controller: ReadableStreamDefaultController;
  keepalive: ReturnType<typeof setInterval>;
}

class SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map();

  addConnection(sessionId: string, controller: ReadableStreamDefaultController, keepalive: ReturnType<typeof setInterval>): void {
    this.connections.set(sessionId, { controller, keepalive });
    console.log(`[SSE] Client connected: ${sessionId} (total: ${this.connections.size})`);
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

  getConnectionCount(): number {
    return this.connections.size;
  }
}

const sseManager = new SSEConnectionManager();

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

async function handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
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

        console.log(`[Tool] Calling: ${toolName} with args:`, JSON.stringify(toolArgs));
        const result = await executeTool(toolName, toolArgs);
        console.log(`[Tool] Completed: ${toolName}`);

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

          sseManager.addConnection(sessionId, controller, keepalive);
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

      const response = await handleJsonRpc(body);

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
            claudeCode: 'Add to your claude_desktop_config.json: { "mcpServers": { "industryx": { "url": "http://<host>:3002/sse" } } }',
            cursor: 'Add to your MCP settings with SSE transport pointing to /sse endpoint',
            generic: 'Connect via SSE to /sse, send JSON-RPC messages to /messages?sessionId=<id>',
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
console.log('  Connect your AI agent via MCP SSE transport:');
console.log('    Claude Code: Add to claude_desktop_config.json');
console.log('    Cursor:      Add to MCP settings');
console.log('===============================================================');
console.log('');
