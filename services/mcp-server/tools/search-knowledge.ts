// MCP Tool: search_knowledge
// Hybrid search across all categories (semantic + keyword + intent + category boosting)

import { searchKnowledge, formatSearchResults, type ToolContext } from './shared';

export const searchKnowledgeTool = {
  name: 'search_knowledge',
  description:
    'Search the IndustryX knowledge base using hybrid retrieval (semantic similarity + keyword matching + intent matching + category boosting). Returns matching knowledge units with structured fields. Use this for general knowledge searches across all categories.',
  inputSchema: {
    type: 'object' as const,
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
        description: 'Optional category filter. Available: design-systems, engineering, architecture, security, economy, deployment, sops, skills, ui-standards, backend-standards, frontend-standards, game-economy, trading, marketplace, anti-cheat, analytics, liveops, premium, monetization, cloud-save, offline-sync',
      },
    },
    required: ['query'],
  },
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 5;
    const category = args.category as string | undefined;
    const { results } = await searchKnowledge(query, limit, category, undefined, ctx.authContext);
    return { content: [{ type: 'text' as const, text: formatSearchResults(results) }] };
  },
};
