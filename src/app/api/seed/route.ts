import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

export async function POST() {
  try {
    const results = await seedDatabase();

    return NextResponse.json(
      {
        success: true,
        message: "Database seeded successfully",
        data: {
          user: results.user
            ? { id: results.user, email: "demo@industryx.io" }
            : null,
          workspace: results.workspace
            ? { id: results.workspace, slug: "demo-personal" }
            : null,
          plans: results.plans,
          apiKey: results.apiKey
            ? {
                prefix: results.apiKey.prefix,
                note: results.apiKey.raw.startsWith("ixk_")
                  ? "Save this key - it won't be shown again"
                  : results.apiKey.raw,
                raw: results.apiKey.raw.startsWith("ixk_")
                  ? results.apiKey.raw
                  : undefined,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed database",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
