import { createHash, randomBytes } from "crypto";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── API Key Utilities ──────────────────────────────────────────────────────

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a secure API key with format `ixk_xxxxxxxxxxxxx`
 * Returns the raw key (shown once), prefix (for display), and hash (for storage)
 */
export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const randomPart = randomBytes(24).toString("hex");
  const raw = `ixk_${randomPart}`;
  const prefix = raw.slice(0, 8);
  const hash = hashApiKey(raw);
  return { raw, prefix, hash };
}

/**
 * Verify an API key against its stored hash
 */
export function verifyApiKey(key: string, hash: string): boolean {
  return hashApiKey(key) === hash;
}

/**
 * Validate an API key from request headers against the database.
 * The middleware sets `x-api-key` header when a valid-format API key is provided.
 *
 * @returns The API key record from the database if valid, null otherwise
 */
export async function validateApiKeyFromHeaders(
  headers: Headers
): Promise<{
  id: string;
  userId: string;
  workspaceId: string | null;
  permissions: string;
  rateLimit: number;
  monthlyLimit: number;
  monthlyUsage: number;
  name: string;
} | null> {
  const apiKey = headers.get("x-api-key");
  if (!apiKey) return null;

  const keyHash = hashApiKey(apiKey);

  const apiKeyRecord = await db.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      permissions: true,
      rateLimit: true,
      monthlyLimit: true,
      monthlyUsage: true,
      name: true,
      isRevoked: true,
      expiresAt: true,
    },
  });

  if (!apiKeyRecord) return null;
  if (apiKeyRecord.isRevoked) return null;
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date())
    return null;

  // Update lastUsedAt asynchronously (don't await)
  db.apiKey
    .update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors from lastUsedAt update
    });

  return {
    id: apiKeyRecord.id,
    userId: apiKeyRecord.userId,
    workspaceId: apiKeyRecord.workspaceId,
    permissions: apiKeyRecord.permissions,
    rateLimit: apiKeyRecord.rateLimit,
    monthlyLimit: apiKeyRecord.monthlyLimit,
    monthlyUsage: apiKeyRecord.monthlyUsage,
    name: apiKeyRecord.name,
  };
}

// ─── Session Utilities ──────────────────────────────────────────────────────

interface ExtendedSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    plan: string;
  };
}

/**
 * Get the server session with our extended type
 */
export async function getServerSession(): Promise<ExtendedSession | null> {
  const session = await nextAuthGetServerSession(authOptions);
  if (!session) return null;

  return {
    user: {
      name: session.user?.name ?? null,
      email: session.user?.email ?? null,
      image: session.user?.image ?? null,
      role: (session.user as Record<string, unknown>)?.role as string ?? "user",
      plan: (session.user as Record<string, unknown>)?.plan as string ?? "free",
    },
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    throw new Error("Authentication required");
  }
  return session;
}

/**
 * Get authenticated identity from either session or API key.
 * This is the primary auth check for API routes that support both methods.
 *
 * @returns Object with auth method and user info, or null if not authenticated
 */
export async function getAuthIdentity(
  headers: Headers
): Promise<
  | {
      method: "session";
      session: ExtendedSession;
      userId?: string;
    }
  | {
      method: "apikey";
      apiKey: NonNullable<Awaited<ReturnType<typeof validateApiKeyFromHeaders>>>;
      userId: string;
    }
  | null
> {
  // Try API key first (from middleware-set header)
  const apiKey = await validateApiKeyFromHeaders(headers);
  if (apiKey) {
    return {
      method: "apikey",
      apiKey,
      userId: apiKey.userId,
    };
  }

  // Try session
  const session = await getServerSession();
  if (session) {
    // Look up user ID from email
    const user = session.user.email
      ? await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
      : null;

    return {
      method: "session",
      session,
      userId: user?.id,
    };
  }

  return null;
}
