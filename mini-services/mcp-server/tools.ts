// IndustryX MCP Server - Tool Definitions
// AI-Native: 8 MCP tools returning structured JSON, not markdown blobs
// This is a SKILLS PROVIDER - AI agents call these tools to get knowledge
// Enhanced: Auth context, permission checks, usage tracking

import {
  searchKnowledge,
  getDocument,
  buildContext,
  listDocuments,
  trackUsage,
  type SearchResult,
  type KnowledgeDocumentSummary,
  type AuthContext,
} from './api-client';

// MCP Tool definition schema
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
}

interface MCPPropertySchema {
  type: string;
  description: string;
  default?: unknown;
  enum?: string[];
}

// MCP Tool result type
export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// Permission levels
const PERMISSION_READ = 'read';
const PERMISSION_ADMIN = 'admin';
const PERMISSION_WRITE = 'write';

// Tools that require admin/write permissions (modify data)
const ADMIN_TOOLS = new Set(['ingest_knowledge', 'rebuild_index']);

// Tools that are read-only
const READ_TOOLS = new Set([
  'search_knowledge',
  'retrieve_knowledge',
  'build_context',
  'search_skills',
  'search_sops',
  'search_architecture',
  'search_security',
  'search_game_system',
]);

// Category groups for search_game_system
const GAME_SYSTEM_CATEGORIES = [
  'game-economy',
  'trading',
  'marketplace',
  'monetization',
  'premium',
  'anti-cheat',
];

// All 8 MCP tool definitions
export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'search_knowledge',
    description:
      'Search the IndustryX knowledge base using hybrid retrieval (semantic similarity + keyword matching + intent matching + category boosting). Returns matching knowledge units with structured fields. Use this for general knowledge searches across all categories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant knowledge units',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
        category: {
          type: 'string',
          description: 'Optional category filter. Available: skills, sops, architecture, security, economy, deployment, ui-standards, backend-standards, frontend-standards, game-economy, trading, marketplace, anti-cheat, analytics, liveops, premium, monetization, cloud-save, offline-sync',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'retrieve_knowledge',
    description:
      'Retrieve a full knowledge unit by its slug. Returns the complete structured JSON including rules, anti-patterns, implementation steps, dependencies, and examples. Use this after search_knowledge to get full details.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the knowledge unit (e.g., "cloud-save", "auth-security")',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'build_context',
    description:
      'Build an optimized context string from the knowledge base for injection into AI agent prompts. Performs semantic search, retrieves top knowledge units, applies token budget, and assembles a structured context block with rules, steps, anti-patterns, and examples.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query to find relevant knowledge for context building',
        },
        maxDocuments: {
          type: 'number',
          description: 'Maximum number of documents to include in context (default: 5)',
          default: 5,
        },
        maxTokenBudget: {
          type: 'number',
          description: 'Maximum token budget for the assembled context (default: 5000, ~20KB)',
          default: 5000,
        },
        category: {
          type: 'string',
          description: 'Optional category filter to narrow context sources',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_skills',
    description:
      'Search only the "skills" category of the knowledge base. Use this when you need to find implementation skills, technical capabilities, or how-to guides.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for skill-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_sops',
    description:
      'Search only the "sops" (Standard Operating Procedures) category. Use this when you need to find procedures, processes, workflows, or step-by-step guides.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for SOP-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_architecture',
    description:
      'Search only the "architecture" category. Use this when you need to find system design patterns, architecture decisions, or technical structure documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for architecture-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_security',
    description:
      'Search only the "security" category. Use this when you need to find security rules, auth patterns, anti-cheat measures, or vulnerability prevention knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for security-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_game_system',
    description:
      'Search game systems and economy knowledge across multiple categories: game-economy, trading, marketplace, monetization, premium, and anti-cheat. Use this when you need knowledge about game economy design, trading systems, marketplace features, or monetization strategies.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for game system and economy knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
];

// Format search results as structured JSON for MCP clients
function formatSearchResults(results: SearchResult[]): string {
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

// Format a full knowledge unit for display as structured JSON
function formatDocument(doc: KnowledgeDocumentSummary): string {
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

/**
 * Check if the auth context has the required permission for a tool.
 * Returns true if permitted, or an error message string if not.
 */
function checkPermission(toolName: string, authContext: AuthContext | null): string | null {
  // Admin tools require admin or write permission
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

  // Read tools are available to authenticated users with read permission
  if (READ_TOOLS.has(toolName)) {
    // Unauthenticated users can use read tools (with rate limiting handled in index.ts)
    if (!authContext) {
      return null; // Allowed, but rate-limited
    }
    // Authenticated with any permission including read
    const hasRead = authContext.permissions.includes(PERMISSION_READ) || 
                    authContext.permissions.includes(PERMISSION_ADMIN) || 
                    authContext.permissions.includes(PERMISSION_WRITE);
    if (!hasRead) {
      return `Tool "${toolName}" requires read permissions. Your API key has: ${authContext.permissions.join(', ')}`;
    }
    return null;
  }

  // Unknown tools fall through — will be caught as unknown tool in executeTool
  return null;
}

// Execute a tool call by name with the given arguments
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  authContext?: AuthContext | null
): Promise<MCPToolResult> {
  const startTime = Date.now();
  let success = true;
  let errorMessage: string | undefined;

  try {
    // Permission check
    const permError = checkPermission(toolName, authContext ?? null);
    if (permError) {
      success = false;
      errorMessage = permError;
      return {
        content: [{ type: 'text', text: `Permission denied: ${permError}` }],
      };
    }

    switch (toolName) {
      case 'search_knowledge': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const category = args.category as string | undefined;
        const { results } = await searchKnowledge(query, limit, category, undefined, authContext);
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'retrieve_knowledge': {
        const slug = args.slug as string;
        const { document } = await getDocument(slug, authContext);
        return {
          content: [{ type: 'text', text: formatDocument(document) }],
        };
      }

      case 'build_context': {
        const query = args.query as string;
        const maxDocuments = (args.maxDocuments as number) ?? 5;
        const maxTokenBudget = (args.maxTokenBudget as number) ?? 5000;
        const category = args.category as string | undefined;
        const result = await buildContext(query, maxDocuments, maxTokenBudget, category, authContext);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              context: result.context,
              stats: {
                documentsUsed: result.documentsUsed,
                totalTokens: result.totalTokens,
                sources: result.sources,
              },
            }, null, 2),
          }],
        };
      }

      case 'search_skills': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'skills', undefined, authContext);
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_sops': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'sops', undefined, authContext);
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_architecture': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'architecture', undefined, authContext);
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_security': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'security', undefined, authContext);
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_game_system': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const allResults: SearchResult[] = [];
        const perCategoryLimit = Math.max(limit, 3);

        const searchPromises = GAME_SYSTEM_CATEGORIES.map((cat) =>
          searchKnowledge(query, perCategoryLimit, cat, undefined, authContext).catch(() => ({
            results: [] as SearchResult[],
          }))
        );

        const searchResponses = await Promise.all(searchPromises);
        for (const resp of searchResponses) {
          allResults.push(...resp.results);
        }

        // Deduplicate by slug (keep highest score)
        const seen = new Map<string, SearchResult>();
        for (const r of allResults) {
          const existing = seen.get(r.slug);
          if (!existing || r.score > existing.score) {
            seen.set(r.slug, r);
          }
        }

        const finalResults = Array.from(seen.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        return {
          content: [{ type: 'text', text: formatSearchResults(finalResults) }],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${toolName}. Available tools: ${MCP_TOOLS.map((t) => t.name).join(', ')}`,
            },
          ],
        };
    }
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool "${toolName}": ${errorMessage}`,
        },
      ],
    };
  } finally {
    // Track usage after each tool call (fire-and-forget)
    const durationMs = Date.now() - startTime;
    if (authContext) {
      trackUsage(
        {
          userId: authContext.userId,
          apiKeyId: authContext.apiKeyId,
          workspaceId: authContext.workspaceId ?? undefined,
          eventType: 'mcp_call',
          toolName,
          query: (args.query as string) ?? undefined,
          durationMs,
          success,
          errorMessage,
        },
        authContext
      );
    }
  }
}
