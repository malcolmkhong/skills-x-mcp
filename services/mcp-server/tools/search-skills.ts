// MCP Tool: search_skills
// Search only the "skills" category

import { searchKnowledge, formatSearchResults, type ToolContext } from './shared';

export const searchSkillsTool = {
  name: 'search_skills',
  description:
    'Search only the "skills" category of the knowledge base. Use this when you need to find implementation skills, technical capabilities, or how-to guides.',
  inputSchema: {
    type: 'object' as const,
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
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 5;
    const { results } = await searchKnowledge(query, limit, 'skills', undefined, ctx.authContext);
    return { content: [{ type: 'text' as const, text: formatSearchResults(results) }] };
  },
};
