import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";
import { ingestKnowledgeBase, ingestCategory } from "@/lib/knowledge/ingestion";
import { requireAuth } from "@/lib/auth-utils";
import { isValidKnowledgeCategory } from "@/lib/api-validation";
import { handleApiError, apiError, safeParseBody } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    // Require authentication — seeding and ingestion are privileged operations
    await requireAuth();

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    
    // Support ingestion-only mode via ?ingest=true or body.ingest
    const { searchParams } = new URL(request.url);
    const ingestMode = searchParams.get("ingest") || body.ingest;
    const ingestCategoryFilter = searchParams.get("category") || body.category;
    
    if (ingestMode) {
      // Validate category against known categories if provided
      if (ingestCategoryFilter && !isValidKnowledgeCategory(ingestCategoryFilter)) {
        return apiError(
          `Invalid category filter. Must be a known knowledge category.`,
          400
        );
      }

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
    return handleApiError(error, "seed");
  }
}
