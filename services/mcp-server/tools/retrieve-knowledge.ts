// MCP Tool: retrieve_knowledge
// Get a full knowledge unit by its slug

import { getDocument, formatDocument, type ToolContext } from './shared';

export const retrieveKnowledgeTool = {
  name: 'retrieve_knowledge',
  description:
    'Retrieve a full knowledge unit by its slug. Returns the complete structured JSON including rules, anti-patterns, implementation steps, dependencies, and examples. Use this after search_knowledge to get full details.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      slug: {
        type: 'string',
        description: 'The unique slug identifier of the knowledge unit (e.g., "cloud-save", "auth-security")',
      },
    },
    required: ['slug'],
  },
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const slug = args.slug as string;
    const { document } = await getDocument(slug, ctx.authContext);
    return { content: [{ type: 'text' as const, text: formatDocument(document) }] };
  },
};
