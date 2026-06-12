import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUserPlan, getUserUsage } from "@/lib/subscriptions";

// ─── GET /api/plans/current ──────────────────────────────────────────────────
// Get the authenticated user's current plan and usage vs limits.

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

    const [plan, usage] = await Promise.all([
      getUserPlan(user.id),
      getUserUsage(user.id),
    ]);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan,
      usage,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Plans/Current] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get current plan" },
      { status: 500 }
    );
  }
}
