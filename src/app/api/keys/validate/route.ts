import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyAccess } from "@/lib/api-keys";
import { db } from "@/lib/db";

/**
 * GET /api/keys/validate
 * Public endpoint for the MCP server to validate API keys.
 * Query param: apiKey - The raw API key (ixk_xxxxx) to validate.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get("apiKey");

  if (!apiKey) {
    return NextResponse.json(
      { valid: false, error: "Missing apiKey query parameter" },
      { status: 400 }
    );
  }

  // Validate format first
  if (!/^ixk_[0-9a-f]{16,}$/.test(apiKey)) {
    return NextResponse.json(
      { valid: false, error: "Invalid API key format" },
      { status: 400 }
    );
  }

  try {
    const result = await validateApiKeyAccess(apiKey);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 401 }
      );
    }

    // Look up user's plan for the response
    const user = await db.user.findUnique({
      where: { id: result.data.userId },
      select: { plan: true },
    });

    return NextResponse.json({
      valid: true,
      userId: result.data.userId,
      apiKeyId: result.data.id,
      permissions: result.data.permissions,
      plan: user?.plan ?? "free",
      workspaceId: result.data.workspaceId,
      rateLimit: result.data.rateLimit,
      monthlyLimit: result.data.monthlyLimit,
      monthlyUsage: result.data.monthlyUsage,
    });
  } catch (error) {
    console.error("[API] Key validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Internal validation error" },
      { status: 500 }
    );
  }
}
