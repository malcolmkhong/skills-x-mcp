import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

// ─── GET /api/keys ───────────────────────────────────────────────────────────
// List all API keys for the authenticated user

export async function GET() {
  try {
    const session = await requireAuth();

    // Look up user ID from email
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

    const keys = await listApiKeys(user.id);

    return NextResponse.json({ apiKeys: keys });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[API/Keys] GET error:", error);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

// ─── POST /api/keys ──────────────────────────────────────────────────────────
// Create a new API key

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Look up user ID from email
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

    // Check API key limit based on plan
    const plan = await db.subscriptionPlan.findUnique({
      where: { name: user.plan },
      select: { apiKeysLimit: true },
    });

    const keysLimit = plan?.apiKeysLimit ?? 1;

    if (keysLimit > 0) {
      const currentKeyCount = await db.apiKey.count({
        where: { userId: user.id, isRevoked: false },
      });

      if (currentKeyCount >= keysLimit) {
        return NextResponse.json(
          {
            error: "API key limit reached",
            message: `Your ${user.plan} plan allows a maximum of ${keysLimit} API key(s). Upgrade your plan to create more.`,
            currentCount: currentKeyCount,
            limit: keysLimit,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array of strings" },
        { status: 400 }
      );
    }

    const validPermissions = ["read", "write", "admin"];
    if (body.permissions && !body.permissions.every((p: string) => validPermissions.includes(p))) {
      return NextResponse.json(
        { error: `Invalid permissions. Valid values: ${validPermissions.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.rateLimit !== undefined && (typeof body.rateLimit !== "number" || body.rateLimit < 1)) {
      return NextResponse.json(
        { error: "Rate limit must be a positive number" },
        { status: 400 }
      );
    }

    if (body.monthlyLimit !== undefined && (typeof body.monthlyLimit !== "number" || body.monthlyLimit < 0)) {
      return NextResponse.json(
        { error: "Monthly limit must be a non-negative number" },
        { status: 400 }
      );
    }

    if (body.expiresAt !== undefined) {
      const expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt date" },
          { status: 400 }
        );
      }
      if (expiresAt <= new Date()) {
        return NextResponse.json(
          { error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
    }

    // Validate workspaceId if provided
    if (body.workspaceId) {
      const membership = await db.workspaceMember.findFirst({
        where: {
          workspaceId: body.workspaceId,
          userId: user.id,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "You do not have access to the specified workspace" },
          { status: 403 }
        );
      }
    }

    const result = await createApiKey(user.id, {
      name: body.name.trim(),
      workspaceId: body.workspaceId,
      permissions: body.permissions,
      rateLimit: body.rateLimit,
      monthlyLimit: body.monthlyLimit,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[API/Keys] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
