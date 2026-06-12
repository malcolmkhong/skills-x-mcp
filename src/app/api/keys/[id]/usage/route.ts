import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getApiKeyUsage } from "@/lib/api-keys";

// ─── GET /api/keys/[id]/usage ───────────────────────────────────────────────
// Get usage statistics for a specific API key.
// Query params: days (default: 30)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

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

    const usage = await getApiKeyUsage(id, user.id, days);

    if (usage.length === 0) {
      // Could be no data OR key not found — check key existence
      const keyExists = await db.apiKey.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });

      if (!keyExists) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        );
      }
    }

    // Compute summary
    const totalRequests = usage.reduce((sum, d) => sum + d.totalRequests, 0);
    const totalSuccess = usage.reduce((sum, d) => sum + d.successCount, 0);
    const totalErrors = usage.reduce((sum, d) => sum + d.errorCount, 0);
    const activeDays = usage.filter((d) => d.totalRequests > 0).length;

    // Merge byEventType across all days
    const byEventType: Record<string, number> = {};
    for (const day of usage) {
      for (const [eventType, count] of Object.entries(day.byEventType)) {
        byEventType[eventType] = (byEventType[eventType] ?? 0) + count;
      }
    }

    return NextResponse.json({
      days,
      summary: {
        totalRequests,
        totalSuccess,
        totalErrors,
        successRate: totalRequests > 0 ? Math.round((totalSuccess / totalRequests) * 100) : 0,
        activeDays,
        byEventType,
      },
      daily: usage,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[API/Keys/:id/usage] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get API key usage" },
      { status: 500 }
    );
  }
}
