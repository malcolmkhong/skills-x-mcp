import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrackEventInput {
  userId: string;
  apiKeyId?: string;
  workspaceId?: string;
  eventType: string; // mcp_call, api_call, search, retrieve, context_build, ingest
  toolName?: string;
  knowledgeId?: string;
  query?: string;
  durationMs?: number;
  tokensUsed?: number;
  tokenSaved?: number;
  success?: boolean;
  errorMessage?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface DashboardStats {
  totalApiCalls: number;
  totalMcpCalls: number;
  totalTokensSaved: number;
  topKnowledge: TopKnowledgeItem[];
  usageByDay: DayUsage[];
  usageByCategory: CategoryUsage[];
  activeApiKeys: number;
  avgResponseTime: number;
}

export interface TopKnowledgeItem {
  knowledgeId: string;
  title: string;
  category: string;
  accessCount: number;
}

export interface DayUsage {
  date: string;
  apiCalls: number;
  mcpCalls: number;
  totalCalls: number;
}

export interface CategoryUsage {
  category: string;
  count: number;
}

export interface MCPStats {
  callsByTool: ToolCallCount[];
  callsByDay: DayMcpUsage[];
  avgScores: ToolAvgScore[];
  mostPopularTools: ToolCallCount[];
}

export interface ToolCallCount {
  toolName: string;
  count: number;
}

export interface DayMcpUsage {
  date: string;
  calls: number;
}

export interface ToolAvgScore {
  toolName: string;
  avgDurationMs: number;
  successRate: number;
}

export interface KnowledgeAnalytics {
  mostAccessed: KnowledgeAccessItem[];
  categoryDistribution: CategoryDistribution[];
  retrievalTrends: RetrievalTrend[];
  topSearchQueries: SearchQueryItem[];
  lowPerforming: LowPerformingKnowledge[];
}

export interface KnowledgeAccessItem {
  knowledgeId: string;
  title: string;
  category: string;
  accessCount: number;
  avgScore: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface RetrievalTrend {
  date: string;
  retrievals: number;
  avgScore: number;
}

export interface SearchQueryItem {
  query: string;
  count: number;
  avgScore: number;
}

export interface LowPerformingKnowledge {
  knowledgeId: string;
  title: string;
  category: string;
  avgScore: number;
  retrievalCount: number;
}

export interface TokenSavingsAnalytics {
  totalTokensSaved: number;
  totalTokensUsed: number;
  savingsByDay: TokenSavingsDay[];
  comparison: {
    fullContextTokens: number;
    retrievedContextTokens: number;
    savingsPercent: number;
  };
}

export interface TokenSavingsDay {
  date: string;
  tokensUsed: number;
  tokensSaved: number;
}

export interface UserGrowthAnalytics {
  totalUsers: number;
  newUsersByDay: NewUsersDay[];
  activeUsers: number;
}

export interface NewUsersDay {
  date: string;
  newUsers: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function initDayArray<T>(days: number, factory: (date: string) => T): Map<string, T> {
  const map = new Map<string, T>();
  for (let i = days; i >= 0; i--) {
    const d = daysAgo(i);
    map.set(formatDate(d), factory(formatDate(d)));
  }
  return map;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Record a usage event (fire-and-forget).
 * Uses Promise.resolve().then() to avoid blocking the caller.
 */
export function trackEvent(input: TrackEventInput): void {
  try {
    Promise.resolve().then(() =>
      db.usageEvent
        .create({
          data: {
            userId: input.userId,
            apiKeyId: input.apiKeyId ?? null,
            workspaceId: input.workspaceId ?? null,
            eventType: input.eventType,
            toolName: input.toolName ?? null,
            knowledgeId: input.knowledgeId ?? null,
            query: input.query ?? null,
            durationMs: input.durationMs ?? 0,
            tokensUsed: input.tokensUsed ?? 0,
            tokenSaved: input.tokenSaved ?? 0,
            success: input.success ?? true,
            errorMessage: input.errorMessage ?? null,
            userAgent: input.userAgent ?? null,
            ipAddress: input.ipAddress ?? null,
          },
        })
        .catch((err) => {
          console.error("[Analytics] trackEvent error:", err);
        })
    );
  } catch (error) {
    console.error('[trackEvent]', error)
    throw new Error(`Failed to trackEvent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get overview dashboard stats for a user (last 30 days).
 */
export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  try {
    const startDate = daysAgo(30);

    // Parallel queries for efficiency
    const [
      apiCallCount,
      mcpCallCount,
      tokensSavedResult,
      activeKeysCount,
      avgDurationResult,
      usageEvents,
      topKnowledgeEvents,
    ] = await Promise.all([
      // Total API calls
      db.usageEvent.count({
        where: {
          userId,
          eventType: "api_call",
          createdAt: { gte: startDate },
        },
      }),

      // Total MCP calls
      db.usageEvent.count({
        where: {
          userId,
          eventType: "mcp_call",
          createdAt: { gte: startDate },
        },
      }),

      // Total tokens saved
      db.usageEvent.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: { tokenSaved: true },
      }),

      // Active API keys
      db.apiKey.count({
        where: {
          userId,
          isRevoked: false,
        },
      }),

      // Average response time
      db.usageEvent.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate },
          durationMs: { gt: 0 },
        },
        _avg: { durationMs: true },
      }),

      // All usage events for day grouping and category grouping
      db.usageEvent.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        select: {
          eventType: true,
          createdAt: true,
          knowledgeId: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // Top knowledge events
      db.usageEvent.findMany({
        where: {
          userId,
          knowledgeId: { not: null },
          createdAt: { gte: startDate },
        },
        select: {
          knowledgeId: true,
        },
      }),
    ]);

    // Usage by day
    const dayMap = initDayArray(30, (date) => ({
      date,
      apiCalls: 0,
      mcpCalls: 0,
      totalCalls: 0,
    }));

    for (const event of usageEvents) {
      const dateKey = formatDate(event.createdAt);
      const day = dayMap.get(dateKey);
      if (!day) continue;

      if (event.eventType === "api_call") {
        day.apiCalls++;
      } else if (event.eventType === "mcp_call") {
        day.mcpCalls++;
      }
      day.totalCalls++;
    }

    // Usage by category (based on knowledge accessed)
    const knowledgeIds = [
      ...new Set(
        topKnowledgeEvents
          .map((e) => e.knowledgeId)
          .filter((id): id is string => id !== null)
      ),
    ];

    let categoryDistribution: CategoryUsage[] = [];
    let topKnowledge: TopKnowledgeItem[] = [];

    if (knowledgeIds.length > 0) {
      const knowledgeRecords = await db.knowledge.findMany({
        where: {
          id: { in: knowledgeIds },
        },
        select: {
          id: true,
          title: true,
          category: true,
        },
      });

      const knowledgeMap = new Map(
        knowledgeRecords.map((k) => [k.id, k])
      );

      // Count accesses per knowledge
      const accessCounts = new Map<string, number>();
      for (const event of topKnowledgeEvents) {
        if (event.knowledgeId) {
          accessCounts.set(
            event.knowledgeId,
            (accessCounts.get(event.knowledgeId) ?? 0) + 1
          );
        }
      }

      // Top knowledge items
      topKnowledge = Array.from(accessCounts.entries())
        .map(([id, count]) => {
          const k = knowledgeMap.get(id);
          return {
            knowledgeId: id,
            title: k?.title ?? "Unknown",
            category: k?.category ?? "unknown",
            accessCount: count,
          };
        })
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10);

      // Category distribution
      const categoryCounts = new Map<string, number>();
      for (const [id, count] of accessCounts.entries()) {
        const k = knowledgeMap.get(id);
        const cat = k?.category ?? "unknown";
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + count);
      }

      categoryDistribution = Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
    }

    return {
      totalApiCalls: apiCallCount,
      totalMcpCalls: mcpCallCount,
      totalTokensSaved: tokensSavedResult._sum.tokenSaved ?? 0,
      topKnowledge,
      usageByDay: Array.from(dayMap.values()),
      usageByCategory: categoryDistribution,
      activeApiKeys: activeKeysCount,
      avgResponseTime: Math.round(avgDurationResult._avg.durationMs ?? 0),
    };
  } catch (error) {
    console.error('[getDashboardStats]', error)
    throw new Error(`Failed to getDashboardStats: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get MCP-specific analytics for a user.
 */
export async function getMCPStats(
  userId: string,
  days: number = 30
): Promise<MCPStats> {
  try {
    const startDate = daysAgo(days);

    const events = await db.usageEvent.findMany({
      where: {
        userId,
        eventType: "mcp_call",
        createdAt: { gte: startDate },
      },
      select: {
        toolName: true,
        durationMs: true,
        success: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Calls by tool
    const toolCountMap = new Map<string, number>();
    const toolDurationMap = new Map<string, { total: number; count: number }>();
    const toolSuccessMap = new Map<string, { success: number; total: number }>();

    // Calls by day
    const dayMap = initDayArray(days, (date) => ({
      date,
      calls: 0,
    }));

    for (const event of events) {
      const tool = event.toolName ?? "unknown";

      // Tool counts
      toolCountMap.set(tool, (toolCountMap.get(tool) ?? 0) + 1);

      // Tool durations
      const dur = toolDurationMap.get(tool) ?? { total: 0, count: 0 };
      dur.total += event.durationMs;
      dur.count++;
      toolDurationMap.set(tool, dur);

      // Tool success rates
      const suc = toolSuccessMap.get(tool) ?? { success: 0, total: 0 };
      suc.total++;
      if (event.success) suc.success++;
      toolSuccessMap.set(tool, suc);

      // Day counts
      const dateKey = formatDate(event.createdAt);
      const day = dayMap.get(dateKey);
      if (day) day.calls++;
    }

    const callsByTool: ToolCallCount[] = Array.from(toolCountMap.entries())
      .map(([toolName, count]) => ({ toolName, count }))
      .sort((a, b) => b.count - a.count);

    const avgScores: ToolAvgScore[] = Array.from(toolDurationMap.entries()).map(
      ([toolName, { total, count }]) => {
        const suc = toolSuccessMap.get(toolName);
        return {
          toolName,
          avgDurationMs: Math.round(total / count),
          successRate: suc ? Math.round((suc.success / suc.total) * 100) : 0,
        };
      }
    );

    return {
      callsByTool,
      callsByDay: Array.from(dayMap.values()),
      avgScores,
      mostPopularTools: callsByTool.slice(0, 5),
    };
  } catch (error) {
    console.error('[getMCPStats]', error)
    throw new Error(`Failed to getMCPStats: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get knowledge analytics.
 * If userId is provided, filters to that user's interactions.
 * If workspaceId is provided, filters to that workspace's knowledge.
 */
export async function getKnowledgeAnalytics(
  userId?: string,
  workspaceId?: string
): Promise<KnowledgeAnalytics> {
  try {
    const startDate = daysAgo(30);

    // Build where clauses
    const eventWhere: Record<string, unknown> = {
      eventType: { in: ["search", "retrieve", "context_build"] },
      createdAt: { gte: startDate },
    };
    if (userId) eventWhere.userId = userId;

    const knowledgeWhere: Record<string, unknown> = {
      isActive: true,
    };
    if (workspaceId) knowledgeWhere.workspaceId = workspaceId;

    // Fetch knowledge items for the workspace
    const knowledgeItems = await db.knowledge.findMany({
      where: knowledgeWhere,
      select: {
        id: true,
        title: true,
        category: true,
        accessCount: true,
      },
    });

    const knowledgeMap = new Map(knowledgeItems.map((k) => [k.id, k]));

    // Fetch retrieval stats
    const retrievalWhere: Record<string, unknown> = {
      retrievedAt: { gte: startDate },
    };

    // If workspaceId is set, filter by knowledge IDs in that workspace
    let retrievalKnowledgeIds: string[] | null = null;
    if (workspaceId) {
      retrievalKnowledgeIds = knowledgeItems.map((k) => k.id);
      if (retrievalKnowledgeIds.length === 0) {
        // No knowledge in this workspace
        return {
          mostAccessed: [],
          categoryDistribution: [],
          retrievalTrends: [],
          topSearchQueries: [],
          lowPerforming: [],
        };
      }
      retrievalWhere.knowledgeId = { in: retrievalKnowledgeIds };
    }

    const [retrievalStats, searchEvents] = await Promise.all([
      db.retrievalStat.findMany({
        where: retrievalWhere,
        select: {
          knowledgeId: true,
          query: true,
          score: true,
          retrievedAt: true,
        },
        orderBy: { retrievedAt: "desc" },
      }),

      db.usageEvent.findMany({
        where: {
          ...eventWhere,
          query: { not: null },
        },
        select: {
          query: true,
        },
      }),
    ]);

    // Most accessed knowledge
    const accessCountMap = new Map<string, number>();
    const scoreMap = new Map<string, { total: number; count: number }>();

    for (const stat of retrievalStats) {
      accessCountMap.set(
        stat.knowledgeId,
        (accessCountMap.get(stat.knowledgeId) ?? 0) + 1
      );
      const s = scoreMap.get(stat.knowledgeId) ?? { total: 0, count: 0 };
      s.total += stat.score;
      s.count++;
      scoreMap.set(stat.knowledgeId, s);
    }

    const mostAccessed: KnowledgeAccessItem[] = Array.from(
      accessCountMap.entries()
    )
      .map(([id, accessCount]) => {
        const k = knowledgeMap.get(id);
        const scores = scoreMap.get(id);
        return {
          knowledgeId: id,
          title: k?.title ?? "Unknown",
          category: k?.category ?? "unknown",
          accessCount,
          avgScore: scores ? Math.round((scores.total / scores.count) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // Category distribution
    const categoryCountMap = new Map<string, number>();
    for (const k of knowledgeItems) {
      categoryCountMap.set(k.category, (categoryCountMap.get(k.category) ?? 0) + 1);
    }
    const totalKnowledge = knowledgeItems.length || 1;

    const categoryDistribution: CategoryDistribution[] = Array.from(
      categoryCountMap.entries()
    )
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalKnowledge) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Retrieval trends by day
    const trendDayMap = initDayArray(30, (date) => ({
      date,
      retrievals: 0,
      totalScore: 0,
    }));

    for (const stat of retrievalStats) {
      const dateKey = formatDate(stat.retrievedAt);
      const day = trendDayMap.get(dateKey);
      if (!day) continue;
      day.retrievals++;
      day.totalScore += stat.score;
    }

    const retrievalTrends: RetrievalTrend[] = Array.from(
      trendDayMap.values()
    ).map((d) => ({
      date: d.date,
      retrievals: d.retrievals,
      avgScore: d.retrievals > 0 ? Math.round((d.totalScore / d.retrievals) * 100) / 100 : 0,
    }));

    // Top search queries
    const queryCountMap = new Map<string, { count: number; totalScore: number }>();

    for (const stat of retrievalStats) {
      if (!stat.query) continue;
      const q = stat.query.toLowerCase().trim();
      if (!q) continue;
      const existing = queryCountMap.get(q) ?? { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += stat.score;
      queryCountMap.set(q, existing);
    }

    const topSearchQueries: SearchQueryItem[] = Array.from(
      queryCountMap.entries()
    )
      .map(([query, { count, totalScore }]) => ({
        query,
        count,
        avgScore: Math.round((totalScore / count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Low-performing knowledge (low avg score, minimum 3 retrievals)
    const lowPerforming: LowPerformingKnowledge[] = Array.from(
      scoreMap.entries()
    )
      .filter(([, scores]) => scores.count >= 3)
      .map(([id, scores]) => {
        const k = knowledgeMap.get(id);
        const avgScore = scores.total / scores.count;
        return {
          knowledgeId: id,
          title: k?.title ?? "Unknown",
          category: k?.category ?? "unknown",
          avgScore: Math.round(avgScore * 100) / 100,
          retrievalCount: scores.count,
        };
      })
      .filter((k) => k.avgScore < 0.5)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 10);

    return {
      mostAccessed,
      categoryDistribution,
      retrievalTrends,
      topSearchQueries,
      lowPerforming,
    };
  } catch (error) {
    console.error('[getKnowledgeAnalytics]', error)
    throw new Error(`Failed to getKnowledgeAnalytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get token savings analytics for a user.
 */
export async function getTokenSavings(
  userId: string,
  days: number = 30
): Promise<TokenSavingsAnalytics> {
  try {
    const startDate = daysAgo(days);

    const [totalResult, dailyEvents] = await Promise.all([
      db.usageEvent.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: {
          tokensUsed: true,
          tokenSaved: true,
        },
      }),

      db.usageEvent.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
          eventType: { in: ["retrieve", "context_build"] },
        },
        select: {
          tokensUsed: true,
          tokenSaved: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const totalTokensUsed = totalResult._sum.tokensUsed ?? 0;
    const totalTokensSaved = totalResult._sum.tokenSaved ?? 0;

    // Savings by day
    const dayMap = initDayArray(days, (date) => ({
      date,
      tokensUsed: 0,
      tokensSaved: 0,
    }));

    for (const event of dailyEvents) {
      const dateKey = formatDate(event.createdAt);
      const day = dayMap.get(dateKey);
      if (!day) continue;
      day.tokensUsed += event.tokensUsed;
      day.tokensSaved += event.tokenSaved;
    }

    const savingsByDay = Array.from(dayMap.values());

    // Comparison: full context (tokensUsed + tokensSaved) vs retrieved context (tokensUsed)
    const fullContextTokens = totalTokensUsed + totalTokensSaved;
    const retrievedContextTokens = totalTokensUsed;
    const savingsPercent =
      fullContextTokens > 0
        ? Math.round((totalTokensSaved / fullContextTokens) * 100)
        : 0;

    return {
      totalTokensSaved,
      totalTokensUsed,
      savingsByDay,
      comparison: {
        fullContextTokens,
        retrievedContextTokens,
        savingsPercent,
      },
    };
  } catch (error) {
    console.error('[getTokenSavings]', error)
    throw new Error(`Failed to getTokenSavings: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get user growth analytics.
 */
export async function getUserGrowth(
  days: number = 30
): Promise<UserGrowthAnalytics> {
  try {
    const startDate = daysAgo(days);

    const [totalUsers, recentUsers, activeUserIds] = await Promise.all([
      db.user.count(),

      db.user.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      db.usageEvent.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          userId: true,
        },
        distinct: ["userId"],
      }),
    ]);

    // New users by day
    const dayMap = initDayArray(days, (date) => ({
      date,
      newUsers: 0,
    }));

    for (const user of recentUsers) {
      const dateKey = formatDate(user.createdAt);
      const day = dayMap.get(dateKey);
      if (day) day.newUsers++;
    }

    return {
      totalUsers,
      newUsersByDay: Array.from(dayMap.values()),
      activeUsers: activeUserIds.length,
    };
  } catch (error) {
    console.error('[getUserGrowth]', error)
    throw new Error(`Failed to getUserGrowth: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
