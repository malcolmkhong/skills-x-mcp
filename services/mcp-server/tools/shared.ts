// MCP Tools: Shared types, imports, and formatters
// All individual tool files import from this shared module

import {
  searchKnowledge as searchKnowledgeAPI,
  getDocument as getDocumentAPI,
  buildContext as buildContextAPI,
  type SearchResult,
  type KnowledgeDocumentSummary,
  type AuthContext,
} from '../api-client';

// ─── Re-export API functions for tool use ──────────────────────────────────

export { searchKnowledgeAPI as searchKnowledge, getDocumentAPI as getDocument, buildContextAPI as buildContext };
export type { AuthContext, SearchResult, KnowledgeDocumentSummary };

// ─── Tool execution context ────────────────────────────────────────────────

export interface ToolContext {
  authContext: AuthContext | null;
}

// ─── MCP Tool interface ────────────────────────────────────────────────────

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<MCPToolResult>;
}

export interface MCPPropertySchema {
  type: string;
  description: string;
  default?: unknown;
  enum?: string[];
}

// ─── Permission levels ─────────────────────────────────────────────────────

export const PERMISSION_READ = 'read';
export const PERMISSION_ADMIN = 'admin';
export const PERMISSION_WRITE = 'write';

// Tools that require admin/write permissions (modify data)
export const ADMIN_TOOLS = new Set(['ingest_knowledge', 'rebuild_index']);

// Tools that are read-only
export const READ_TOOLS = new Set([
  'search_knowledge',
  'retrieve_knowledge',
  'build_context',
  'search_skills',
  'search_sops',
  'search_architecture',
  'search_security',
  'search_game_system',
]);

// ─── Format search results ─────────────────────────────────────────────────

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No matching knowledge units found. Try a different query or broader search terms.';
  }

  const formatted = results.map((r, i) => ({
    index: i + 1,
    id: r.slug,
    title: r.title,
    category: r.category,
    description: r.description,
    tags: r.tags,
    intents: r.intents,
    relevanceScore: parseFloat(r.score.toFixed(4)),
    scoreBreakdown: {
      embedding: parseFloat(r.embeddingScore.toFixed(4)),
      keyword: parseFloat(r.keywordScore.toFixed(4)),
      category: parseFloat(r.categoryScore.toFixed(4)),
      intent: parseFloat(r.intentScore.toFixed(4)),
      usage: parseFloat(r.usageWeight.toFixed(4)),
    },
  }));

  return JSON.stringify(formatted, null, 2);
}

// ─── Format a full knowledge unit ──────────────────────────────────────────

export function formatDocument(doc: KnowledgeDocumentSummary): string {
  const formatted = {
    id: doc.slug,
    title: doc.title,
    category: doc.category,
    description: doc.description,
    tags: doc.tags,
    intents: doc.intents,
    dependencies: doc.dependencies,
    anti_patterns: doc.antiPatterns,
    implementation_steps: doc.implementationSteps,
    rules: doc.rules,
    examples: doc.examples,
    references: doc.references,
    metadata: {
      version: doc.schemaVersion,
      docVersion: doc.version,
      accessCount: doc.accessCount,
      updatedAt: doc.updatedAt,
    },
  };

  return JSON.stringify(formatted, null, 2);
}

// ─── Permission check ──────────────────────────────────────────────────────

export function checkPermission(toolName: string, authContext: AuthContext | null): string | null {
  if (ADMIN_TOOLS.has(toolName)) {
    if (!authContext) {
      return `Tool "${toolName}" requires authentication with admin permissions. Connect with an API key that has admin or write access.`;
    }
    const hasAdmin = authContext.permissions.includes(PERMISSION_ADMIN) || authContext.permissions.includes(PERMISSION_WRITE);
    if (!hasAdmin) {
      return `Tool "${toolName}" requires admin or write permissions. Your API key only has: ${authContext.permissions.join(', ')}`;
    }
    return null;
  }

  if (READ_TOOLS.has(toolName)) {
    if (!authContext) {
      return null; // Allowed, but rate-limited
    }
    const hasRead = authContext.permissions.includes(PERMISSION_READ) ||
                    authContext.permissions.includes(PERMISSION_ADMIN) ||
                    authContext.permissions.includes(PERMISSION_WRITE);
    if (!hasRead) {
      return `Tool "${toolName}" requires read permissions. Your API key has: ${authContext.permissions.join(', ')}`;
    }
    return null;
  }

  return null;
}
