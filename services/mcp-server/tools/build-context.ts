// MCP Tool: build_context
// Build an optimized context string from the knowledge base for AI agent prompts

import { buildContext as buildContextAPI, type ToolContext } from './shared';

export const buildContextTool = {
  name: 'build_context',
  description:
    'Build an optimized context string from the knowledge base for injection into AI agent prompts. Performs semantic search, retrieves top knowledge units, applies token budget, and assembles a structured context block with rules, steps, anti-patterns, and examples.',
  inputSchema: {
    type: 'object' as const,
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
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const maxDocuments = (args.maxDocuments as number) ?? 5;
    const maxTokenBudget = (args.maxTokenBudget as number) ?? 5000;
    const category = args.category as string | undefined;
    const result = await buildContextAPI(query, maxDocuments, maxTokenBudget, category, ctx.authContext);
    return {
      content: [{
        type: 'text' as const,
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
  },
};
