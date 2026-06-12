import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getDashboardStats } from "@/lib/analytics";

// ─── GET /api/analytics/dashboard ──────────────────────────────────────────
// Returns overview dashboard stats for the authenticated user.

export async function GET() {
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

    const stats = await getDashboardStats(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Analytics/Dashboard] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard stats" },
      { status: 500 }
    );
  }
}
