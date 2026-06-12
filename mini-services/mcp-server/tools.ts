// IndustryX MCP Server - Tool Definitions
// Defines the 7 MCP tools for knowledge retrieval

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

// All 7 MCP tool definitions
export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'search_knowledge',
    description:
      'Search the IndustryX knowledge base for relevant documents using hybrid retrieval (semantic + keyword). Returns matching documents with slug, title, category, description, and relevance score.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant knowledge documents',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'retrieve_knowledge',
    description:
      'Retrieve a full knowledge document by its slug. Returns the complete document including the full markdown content.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the knowledge document',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'search_skills',
    description:
      'Search only the "skills" category of the knowledge base. Returns matching skill-related documents.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for skill-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_sops',
    description:
      'Search only the "sops" (Standard Operating Procedures) category of the knowledge base. Returns matching SOP documents.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for SOP-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_architecture',
    description:
      'Search only the "architecture" category of the knowledge base. Returns matching architecture-related documents.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for architecture-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_security',
    description:
      'Search only the "security" category of the knowledge base. Returns matching security-related documents.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for security-related knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_game_system',
    description:
      'Search game systems and economy knowledge across multiple categories: game-economy, trading, marketplace, monetization, premium, and anti-cheat. Returns matching documents from any of these categories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query for game system and economy knowledge',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
];

// Format search results as a readable text response
function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No matching documents found.';
  }

  return results
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}** (${r.category})\n` +
        `   Slug: ${r.slug}\n` +
        `   Score: ${r.score.toFixed(4)}\n` +
        `   ${r.description}`
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
        const { results } = await searchKnowledge(query, limit);
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
        // Search across multiple game-system categories
        // We'll search each category and merge results
        const allResults: SearchResult[] = [];
        const perCategoryLimit = Math.max(limit, 3); // get a few per category for better coverage

        const searchPromises = GAME_SYSTEM_CATEGORIES.map((cat) =>
          searchKnowledge(query, perCategoryLimit, cat).catch(() => ({
            results: [],
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

        // Sort by score descending and limit
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
