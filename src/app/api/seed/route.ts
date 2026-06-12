import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";
import { ingestKnowledgeBase, ingestCategory } from "@/lib/knowledge/ingestion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Support ingestion-only mode via ?ingest=true or body.ingest
    const { searchParams } = new URL(request.url);
    const ingestMode = searchParams.get("ingest") || body.ingest;
    const ingestCategoryFilter = searchParams.get("category") || body.category;
    
    if (ingestMode) {
      let result;
      if (ingestCategoryFilter) {
        result = await ingestCategory(ingestCategoryFilter as any);
      } else {
        result = await ingestKnowledgeBase();
      }
      return NextResponse.json({
        success: true,
        message: "Knowledge ingestion complete",
        data: result,
      });
    }
    
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
