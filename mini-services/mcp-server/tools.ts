// IndustryX MCP Server - Tool Definitions
// 8 MCP tools for AI agents to access IndustryX knowledge
// This is a SKILLS PROVIDER - AI agents call these tools to get knowledge

import {
  searchKnowledge,
  getDocument,
  buildContext,
  listDocuments,
  type SearchResult,
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
      'Search the IndustryX knowledge base using hybrid retrieval (semantic similarity + keyword matching + category boosting). Returns matching documents with slug, title, category, description, and relevance score. Use this for general knowledge searches across all categories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant knowledge documents',
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
      'Retrieve a full knowledge document by its slug. Returns the complete document including the full markdown content. Use this after search_knowledge to get the full content of a relevant document.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the knowledge document (e.g., "cloud-save", "auth-security")',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'build_context',
    description:
      'Build an optimized context string from the knowledge base for injection into AI agent prompts. Performs semantic search, retrieves top documents, applies token budget, and assembles a clean context block. Use this when you need to inject relevant knowledge into your prompt efficiently.',
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

// Format search results as a readable text response for MCP clients
function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No matching documents found. Try a different query or broader search terms.';
  }

  return results
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}** (${r.category})\n` +
        `   Slug: ${r.slug}\n` +
        `   Score: ${r.score.toFixed(4)}\n` +
        `   ${r.description}\n` +
        `   → Use retrieve_knowledge with slug "${r.slug}" to get full content`
    )
    .join('\n\n');
}

// Format a full document for display
function formatDocument(doc: {
  slug: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  markdownContent: string;
  version: number;
  accessCount: number;
  updatedAt: string;
}): string {
  return (
    `# ${doc.title}\n\n` +
    `**Category:** ${doc.category}\n` +
    `**Slug:** ${doc.slug}\n` +
    `**Description:** ${doc.description}\n` +
    `**Keywords:** ${doc.keywords.join(', ')}\n` +
    `**Version:** ${doc.version} | **Access Count:** ${doc.accessCount} | **Updated:** ${doc.updatedAt}\n\n` +
    `---\n\n` +
    doc.markdownContent
  );
}

// Execute a tool call by name with the given arguments
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  try {
    switch (toolName) {
      case 'search_knowledge': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const category = args.category as string | undefined;
        const { results } = await searchKnowledge(query, limit, category);
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'retrieve_knowledge': {
        const slug = args.slug as string;
        const { document } = await getDocument(slug);
        return {
          content: [{ type: 'text', text: formatDocument(document) }],
        };
      }

      case 'build_context': {
        const query = args.query as string;
        const maxDocuments = (args.maxDocuments as number) ?? 5;
        const maxTokenBudget = (args.maxTokenBudget as number) ?? 5000;
        const category = args.category as string | undefined;
        const result = await buildContext(query, maxDocuments, maxTokenBudget, category);
        return {
          content: [{
            type: 'text',
            text: `# Assembled Context\n\n${result.context}\n\n---\n**Stats:** ${result.documentsUsed} documents used, ~${result.totalTokens} tokens\n**Sources:** ${result.sources.map(s => `${s.title} (${s.category}, score: ${s.score.toFixed(3)})`).join(', ')}`,
          }],
        };
      }

      case 'search_skills': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'skills');
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_sops': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'sops');
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_architecture': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'architecture');
        return {
          content: [{ type: 'text', text: formatSearchResults(results) }],
        };
      }

      case 'search_security': {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;
        const { results } = await searchKnowledge(query, limit, 'security');
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
          searchKnowledge(query, perCategoryLimit, cat).catch(() => ({
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
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool "${toolName}": ${message}`,
        },
      ],
    };
  }
}
