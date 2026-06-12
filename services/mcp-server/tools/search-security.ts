// MCP Tool: search_security
// Search only the "security" category

import { searchKnowledge, formatSearchResults, type ToolContext } from './shared';

export const searchSecurityTool = {
  name: 'search_security',
  description:
    'Search only the "security" category. Use this when you need to find security rules, auth patterns, anti-cheat measures, or vulnerability prevention knowledge.',
  inputSchema: {
    type: 'object' as const,
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
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 5;
    const { results } = await searchKnowledge(query, limit, 'security', undefined, ctx.authContext);
    return { content: [{ type: 'text' as const, text: formatSearchResults(results) }] };
  },
};
