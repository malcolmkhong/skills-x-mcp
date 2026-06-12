import { NextResponse } from "next/server";
import { getPlans, PLAN_FEATURES } from "@/lib/subscriptions";

// ─── GET /api/plans ──────────────────────────────────────────────────────────
// List all available subscription plans with features and pricing.

export async function GET() {
  try {
    const plans = await getPlans();

    // Build feature comparison matrix
    const allFeatures = new Set<string>();
    for (const featureList of Object.values(PLAN_FEATURES)) {
      for (const feature of featureList) {
        allFeatures.add(feature);
      }
    }

    return NextResponse.json({
      plans,
      planFeatures: PLAN_FEATURES,
      comparison: {
        tiers: ["free", "pro", "ultra", "enterprise"],
        features: Array.from(allFeatures),
      },
    });
  } catch (error) {
    console.error("[Plans] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
}
