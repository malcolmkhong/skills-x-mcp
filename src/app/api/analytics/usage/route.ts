import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// ─── GET /api/analytics/usage ──────────────────────────────────────────────
// Returns usage events timeline with filtering.
// Query params: days (default: 30), eventType (optional), apiKeyId (optional)

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "Days parameter must be between 1 and 365" },
        { status: 400 }
      );
    }

    const eventType = url.searchParams.get("eventType") ?? undefined;
    const apiKeyId = url.searchParams.get("apiKeyId") ?? undefined;

    // Validate apiKeyId ownership if provided
    if (apiKeyId) {
      const key = await db.apiKey.findFirst({
        where: { id: apiKeyId, userId: user.id },
        select: { id: true },
      });
      if (!key) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        );
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
      createdAt: { gte: startDate },
    };

    if (eventType) {
      where.eventType = eventType;
    }

    if (apiKeyId) {
      where.apiKeyId = apiKeyId;
    }

    // Fetch events with pagination
    const events = await db.usageEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventType: true,
        toolName: true,
        knowledgeId: true,
        query: true,
        durationMs: true,
        tokensUsed: true,
        tokenSaved: true,
        success: true,
        errorMessage: true,
        createdAt: true,
      },
      take: 500, // Limit to prevent huge responses
    });

    // Compute summary
    const totalEvents = events.length;
    const successCount = events.filter((e) => e.success).length;
    const totalTokensUsed = events.reduce((sum, e) => sum + e.tokensUsed, 0);
    const totalTokensSaved = events.reduce((sum, e) => sum + e.tokenSaved, 0);
    const avgDurationMs =
      totalEvents > 0
        ? Math.round(
            events.reduce((sum, e) => sum + e.durationMs, 0) / totalEvents
          )
        : 0;

    // Group by event type
    const byEventType: Record<string, number> = {};
    for (const event of events) {
      byEventType[event.eventType] =
        (byEventType[event.eventType] ?? 0) + 1;
    }

    return NextResponse.json({
      summary: {
        totalEvents,
        successCount,
        errorCount: totalEvents - successCount,
        successRate:
          totalEvents > 0
            ? Math.round((successCount / totalEvents) * 100)
            : 0,
        totalTokensUsed,
        totalTokensSaved,
        avgDurationMs,
        byEventType,
      },
      events,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Analytics/Usage] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get usage timeline" },
      { status: 500 }
    );
  }
}
