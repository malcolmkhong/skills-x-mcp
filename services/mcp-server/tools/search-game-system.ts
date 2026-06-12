// MCP Tool: search_game_system
// Search game systems and economy knowledge across multiple categories

import { searchKnowledge, formatSearchResults, type ToolContext } from './shared';

const GAME_SYSTEM_CATEGORIES = [
  'game-economy',
  'trading',
  'marketplace',
  'monetization',
  'premium',
  'anti-cheat',
];

export const searchGameSystemTool = {
  name: 'search_game_system',
  description:
    'Search game systems and economy knowledge across multiple categories: game-economy, trading, marketplace, monetization, premium, and anti-cheat. Use this when you need knowledge about game economy design, trading systems, marketplace features, or monetization strategies.',
  inputSchema: {
    type: 'object' as const,
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
  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 5;
    const perCategoryLimit = Math.max(limit, 3);

    const searchPromises = GAME_SYSTEM_CATEGORIES.map((cat) =>
      searchKnowledge(query, perCategoryLimit, cat, undefined, ctx.authContext).catch(() => ({
        results: [] as Awaited<ReturnType<typeof searchKnowledge>>['results'],
      }))
    );

    const searchResponses = await Promise.all(searchPromises);
    const allResults = searchResponses.flatMap((resp) => resp.results);

    // Deduplicate by slug (keep highest score)
    const seen = new Map<string, (typeof allResults)[number]>();
    for (const r of allResults) {
      const existing = seen.get(r.slug);
      if (!existing || r.score > existing.score) {
        seen.set(r.slug, r);
      }
    }

    const finalResults = Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { content: [{ type: 'text' as const, text: formatSearchResults(finalResults) }] };
  },
};
