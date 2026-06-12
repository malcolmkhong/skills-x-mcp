// MCP Tool: search_sops
// Search only the "sops" (Standard Operating Procedures) category

import { searchKnowledge, formatSearchResults, type ToolContext } from './shared';

export const searchSopsTool = {
  name: 'search_sops',
  description:
    'Search only the "sops" (Standard Operating Procedures) category. Use this when you need to find procedures, processes, workflows, or step-by-step guides.',
  inputSchema: {
    type: 'object' as const,
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
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 5;
    const { results } = await searchKnowledge(query, limit, 'sops', undefined, ctx.authContext);
    return { content: [{ type: 'text' as const, text: formatSearchResults(results) }] };
  },
};
