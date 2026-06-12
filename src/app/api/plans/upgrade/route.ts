import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { upgradeUserPlan, downgradeUserPlan, getUserPlan } from "@/lib/subscriptions";

// ─── POST /api/plans/upgrade ─────────────────────────────────────────────────
// Upgrade or downgrade the authenticated user's plan.
// Body: { planName: string }

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, plan: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate planName
    if (!body.planName || typeof body.planName !== "string") {
      return NextResponse.json(
        { error: "planName is required and must be a string" },
        { status: 400 }
      );
    }

    const validPlans = ["free", "pro", "ultra", "enterprise"];
    if (!validPlans.includes(body.planName)) {
      return NextResponse.json(
        { error: `Invalid plan name. Valid plans: ${validPlans.join(", ")}` },
        { status: 400 }
      );
    }

    // Can't change to the same plan
    if (user.plan === body.planName) {
      return NextResponse.json(
        { error: `You are already on the ${body.planName} plan` },
        { status: 400 }
      );
    }

    const planOrder: Record<string, number> = {
      free: 0,
      pro: 1,
      ultra: 2,
      enterprise: 3,
    };

    const currentLevel = planOrder[user.plan] ?? 0;
    const targetLevel = planOrder[body.planName] ?? 0;

    let updatedPlan;

    if (targetLevel > currentLevel) {
      // Upgrade
      updatedPlan = await upgradeUserPlan(user.id, body.planName);
    } else {
      // Downgrade
      try {
        updatedPlan = await downgradeUserPlan(user.id, body.planName);
      } catch (error) {
        if (error instanceof Error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    return NextResponse.json({
      message: targetLevel > currentLevel
        ? `Successfully upgraded to ${body.planName} plan`
        : `Successfully downgraded to ${body.planName} plan`,
      previousPlan: user.plan,
      plan: updatedPlan,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("[Plans/Upgrade] POST error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
