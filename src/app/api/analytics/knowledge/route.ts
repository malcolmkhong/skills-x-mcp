import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getKnowledgeAnalytics } from "@/lib/analytics";

// ─── GET /api/analytics/knowledge ─────────────────────────────────────────
// Returns knowledge analytics.
// Query params: workspaceId (optional, filter by workspace)
// If no userId/workspaceId provided, returns global knowledge analytics for the authenticated user.

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
    const workspaceId = url.searchParams.get("workspaceId") ?? undefined;

    // If workspaceId is provided, verify user is a member
    if (workspaceId) {
      const membership = await db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Workspace not found or access denied" },
          { status: 403 }
        );
      }
    }

    const stats = await getKnowledgeAnalytics(user.id, workspaceId);

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Analytics/Knowledge] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get knowledge analytics" },
      { status: 500 }
    );
  }
}
