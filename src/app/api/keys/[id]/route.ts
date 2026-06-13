import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  getApiKey,
  revokeApiKey,
  deleteApiKey,
  updateApiKey,
} from "@/lib/api-keys";
import { safeParseBody } from "@/lib/api-error";

// ─── GET /api/keys/[id] ─────────────────────────────────────────────────────
// Get a single API key by ID

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

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

    const apiKey = await getApiKey(id, user.id);

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[API/Keys/:id] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get API key" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/keys/[id] ──────────────────────────────────────────────────
// Revoke (soft delete) an API key.
// Use query param ?hard=true for permanent deletion.

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

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
    const hardDelete = url.searchParams.get("hard") === "true";
    const reason = url.searchParams.get("reason") ?? undefined;

    if (hardDelete) {
      const deleted = await deleteApiKey(id, user.id);
      if (!deleted) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ message: "API key permanently deleted" });
    }

    const apiKey = await revokeApiKey(id, user.id, reason);
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiKey, message: "API key revoked" });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[API/Keys/:id] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/keys/[id] ───────────────────────────────────────────────────
// Update an API key's mutable properties (name, rateLimit, monthlyLimit, permissions)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

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

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    // Validate fields if provided
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name must be a non-empty string" },
          { status: 400 }
        );
      }
      if (body.name.length > 100) {
        return NextResponse.json(
          { error: "Name must be 100 characters or less" },
          { status: 400 }
        );
      }
    }

    if (body.rateLimit !== undefined) {
      if (typeof body.rateLimit !== "number" || body.rateLimit < 1) {
        return NextResponse.json(
          { error: "Rate limit must be a positive number" },
          { status: 400 }
        );
      }
    }

    if (body.monthlyLimit !== undefined) {
      if (typeof body.monthlyLimit !== "number" || body.monthlyLimit < 0) {
        return NextResponse.json(
          { error: "Monthly limit must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (body.permissions !== undefined) {
      if (!Array.isArray(body.permissions)) {
        return NextResponse.json(
          { error: "Permissions must be an array of strings" },
          { status: 400 }
        );
      }
      const validPermissions = ["read", "write", "admin"];
      if (!body.permissions.every((p: string) => validPermissions.includes(p))) {
        return NextResponse.json(
          { error: `Invalid permissions. Valid values: ${validPermissions.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const apiKey = await updateApiKey(id, user.id, {
      name: body.name?.trim(),
      rateLimit: body.rateLimit,
      monthlyLimit: body.monthlyLimit,
      permissions: body.permissions,
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[API/Keys/:id] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}
