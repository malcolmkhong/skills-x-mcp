// MCP Tool: search_architecture
// Search only the "architecture" category

import { searchKnowledge, formatSearchResults, type ToolContext } from './shared';

export const searchArchitectureTool = {
  name: 'search_architecture',
  description:
    'Search only the "architecture" category. Use this when you need to find system design patterns, architecture decisions, or technical structure documentation.',
  inputSchema: {
    type: 'object' as const,
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
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 5;
    const { results } = await searchKnowledge(query, limit, 'architecture', undefined, ctx.authContext);
    return { content: [{ type: 'text' as const, text: formatSearchResults(results) }] };
  },
};
