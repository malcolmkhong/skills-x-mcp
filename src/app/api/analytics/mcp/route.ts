import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getMCPStats } from "@/lib/analytics";

// ─── GET /api/analytics/mcp ───────────────────────────────────────────────
// Returns MCP-specific analytics for the authenticated user.
// Query params: days (default: 30)

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

    const stats = await getMCPStats(user.id, days);

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Analytics/MCP] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get MCP stats" },
      { status: 500 }
    );
  }
}
