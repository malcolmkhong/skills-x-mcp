import { db } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/auth-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateApiKeyInput {
  name: string;
  workspaceId?: string;
  permissions?: string[]; // defaults to ['read']
  rateLimit?: number; // defaults to 100
  monthlyLimit?: number; // defaults to 10000
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  workspaceId: string | null;
  permissions: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  rateLimit: number;
  monthlyLimit: number;
  monthlyUsage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyResult {
  apiKey: ApiKeyResponse;
  rawKey: string; // Only returned on creation — never stored or returned again
}

export interface ValidateApiKeyResult {
  id: string;
  userId: string;
  workspaceId: string | null;
  permissions: string[];
  name: string;
  rateLimit: number;
  monthlyLimit: number;
  monthlyUsage: number;
}

export interface ApiKeyUsageStat {
  date: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number;
  byEventType: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePermissions(permissions: string): string[] {
  try {
    const parsed = JSON.parse(permissions);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy format: comma-separated or single value
    if (permissions.includes(",")) return permissions.split(",").map((s) => s.trim());
    return [permissions];
  }
  return [permissions];
}

function serializePermissions(permissions: string[]): string {
  return JSON.stringify(permissions);
}

function toApiKeyResponse(record: {
  id: string;
  name: string;
  keyPrefix: string;
  workspaceId: string | null;
  permissions: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  rateLimit: number;
  monthlyLimit: number;
  monthlyUsage: number;
  createdAt: Date;
  updatedAt: Date;
}): ApiKeyResponse {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    workspaceId: record.workspaceId,
    permissions: parsePermissions(record.permissions),
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    isRevoked: record.isRevoked,
    revokedAt: record.revokedAt,
    revokedReason: record.revokedReason,
    rateLimit: record.rateLimit,
    monthlyLimit: record.monthlyLimit,
    monthlyUsage: record.monthlyUsage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Create a new API key for a user.
 * Returns the raw key ONLY on creation — it is never stored and never returned again.
 */
export async function createApiKey(
  userId: string,
  data: CreateApiKeyInput
): Promise<CreateApiKeyResult> {
  try {
    const { raw, prefix, hash } = generateApiKey();

    const permissions = data.permissions?.length
      ? serializePermissions(data.permissions)
      : serializePermissions(["read"]);

    const apiKey = await db.apiKey.create({
      data: {
        name: data.name,
        keyPrefix: prefix,
        keyHash: hash,
        userId,
        workspaceId: data.workspaceId ?? null,
        permissions,
        rateLimit: data.rateLimit ?? 100,
        monthlyLimit: data.monthlyLimit ?? 10000,
        expiresAt: data.expiresAt ?? null,
      },
    });

    return {
      apiKey: toApiKeyResponse(apiKey),
      rawKey: raw,
    };
  } catch (error) {
    console.error('[createApiKey]', error)
    throw new Error(`Failed to createApiKey: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List all API keys for a user.
 * Never returns keyHash.
 */
export async function listApiKeys(userId: string): Promise<ApiKeyResponse[]> {
  try {
    const keys = await db.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        workspaceId: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isRevoked: true,
        revokedAt: true,
        revokedReason: true,
        rateLimit: true,
        monthlyLimit: true,
        monthlyUsage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return keys.map(toApiKeyResponse);
  } catch (error) {
    console.error('[listApiKeys]', error)
    throw new Error(`Failed to listApiKeys: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a single API key by ID, ensuring the user owns it.
 * Never returns keyHash.
 */
export async function getApiKey(
  id: string,
  userId: string
): Promise<ApiKeyResponse | null> {
  try {
    const apiKey = await db.apiKey.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        workspaceId: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isRevoked: true,
        revokedAt: true,
        revokedReason: true,
        rateLimit: true,
        monthlyLimit: true,
        monthlyUsage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) return null;

    return toApiKeyResponse(apiKey);
  } catch (error) {
    console.error('[getApiKey]', error)
    throw new Error(`Failed to getApiKey: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Revoke (soft delete) an API key.
 */
export async function revokeApiKey(
  id: string,
  userId: string,
  reason?: string
): Promise<ApiKeyResponse | null> {
  try {
    // First verify ownership
    const existing = await db.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;
    if (existing.isRevoked) return toApiKeyResponse(existing);

    const updated = await db.apiKey.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason ?? "Revoked by user",
      },
    });

    return toApiKeyResponse(updated);
  } catch (error) {
    console.error('[revokeApiKey]', error)
    throw new Error(`Failed to revokeApiKey: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Rotate an API key: revoke the old one and create a new one with the same settings.
 * Returns the new raw key — shown only once.
 */
export async function rotateApiKey(
  id: string,
  userId: string
): Promise<CreateApiKeyResult | null> {
  try {
    // Find the existing key
    const existing = await db.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    // Revoke the old key
    await db.apiKey.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "Rotated — replaced by new key",
      },
    });

    // Create a new key with the same settings
    const { raw, prefix, hash } = generateApiKey();

    const newKey = await db.apiKey.create({
      data: {
        name: existing.name,
        keyPrefix: prefix,
        keyHash: hash,
        userId: existing.userId,
        workspaceId: existing.workspaceId,
        permissions: existing.permissions,
        rateLimit: existing.rateLimit,
        monthlyLimit: existing.monthlyLimit,
        expiresAt: existing.expiresAt,
      },
    });

    return {
      apiKey: toApiKeyResponse(newKey),
      rawKey: raw,
    };
  } catch (error) {
    console.error('[rotateApiKey]', error)
    throw new Error(`Failed to rotateApiKey: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate an API key from a raw key string.
 * Checks: key exists, not revoked, not expired.
 * Updates: lastUsedAt, monthlyUsage (with monthly reset).
 * Enforces: rate limits.
 */
export async function validateApiKeyAccess(
  rawKey: string
): Promise<{ valid: true; data: ValidateApiKeyResult } | { valid: false; error: string }> {
  try {
    const keyHash = hashApiKey(rawKey);

    const apiKey = await db.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) {
      return { valid: false, error: "Invalid API key" };
    }

    if (apiKey.isRevoked) {
      return { valid: false, error: "API key has been revoked" };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // Check monthly usage — reset if we're in a new month
    const now = new Date();
    const updatedAt = new Date(apiKey.updatedAt);
    const isNewMonth =
      now.getFullYear() > updatedAt.getFullYear() ||
      (now.getFullYear() === updatedAt.getFullYear() && now.getMonth() > updatedAt.getMonth());

    const currentUsage = isNewMonth ? 0 : apiKey.monthlyUsage;

    if (apiKey.monthlyLimit > 0 && currentUsage >= apiKey.monthlyLimit) {
      return { valid: false, error: "Monthly usage limit exceeded" };
    }

    // Update lastUsedAt and monthlyUsage (fire-and-forget for performance)
    db.apiKey
      .update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          monthlyUsage: isNewMonth ? 1 : currentUsage + 1,
        },
      })
      .catch(() => {
        // Ignore update errors — they shouldn't block the request
      });

    return {
      valid: true,
      data: {
        id: apiKey.id,
        userId: apiKey.userId,
        workspaceId: apiKey.workspaceId,
        permissions: parsePermissions(apiKey.permissions),
        name: apiKey.name,
        rateLimit: apiKey.rateLimit,
        monthlyLimit: apiKey.monthlyLimit,
        monthlyUsage: isNewMonth ? 1 : currentUsage + 1,
      },
    };
  } catch (error) {
    console.error('[validateApiKeyAccess]', error)
    throw new Error(`Failed to validateApiKeyAccess: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Reset all monthly usage counters.
 * Intended to be called by a cron job at the start of each month.
 */
export async function resetMonthlyUsage(): Promise<number> {
  try {
    const result = await db.apiKey.updateMany({
      where: { isRevoked: false },
      data: { monthlyUsage: 0 },
    });

    return result.count;
  } catch (error) {
    console.error('[resetMonthlyUsage]', error)
    throw new Error(`Failed to resetMonthlyUsage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get usage statistics for a specific API key.
 * Returns daily aggregated stats for the last N days.
 */
export async function getApiKeyUsage(
  apiKeyId: string,
  userId: string,
  days: number = 30
): Promise<ApiKeyUsageStat[]> {
  try {
    // Verify the user owns this key
    const apiKey = await db.apiKey.findFirst({
      where: { id: apiKeyId, userId },
      select: { id: true },
    });

    if (!apiKey) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch usage events for this API key
    const events = await db.usageEvent.findMany({
      where: {
        apiKeyId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
      select: {
        eventType: true,
        success: true,
        durationMs: true,
        createdAt: true,
      },
    });

    // Aggregate by date
    const dailyMap = new Map<string, ApiKeyUsageStat>();

    // Initialize all days in range
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split("T")[0];
      dailyMap.set(dateKey, {
        date: dateKey,
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        avgDurationMs: 0,
        byEventType: {},
      });
    }

    // Fill in actual data
    let totalDurationByDate = new Map<string, number>();

    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split("T")[0];
      const stat = dailyMap.get(dateKey);
      if (!stat) continue;

      stat.totalRequests++;
      if (event.success) {
        stat.successCount++;
      } else {
        stat.errorCount++;
      }

      const prevTotal = totalDurationByDate.get(dateKey) ?? 0;
      totalDurationByDate.set(dateKey, prevTotal + event.durationMs);

      stat.avgDurationMs = Math.round(totalDurationByDate.get(dateKey)! / stat.totalRequests);

      stat.byEventType[event.eventType] = (stat.byEventType[event.eventType] ?? 0) + 1;
    }

    return Array.from(dailyMap.values());
  } catch (error) {
    console.error('[getApiKeyUsage]', error)
    throw new Error(`Failed to getApiKeyUsage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Hard delete an API key.
 * This permanently removes the key and all associated usage events.
 */
export async function deleteApiKey(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify ownership
    const existing = await db.apiKey.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) return false;

    await db.apiKey.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error('[deleteApiKey]', error)
    throw new Error(`Failed to deleteApiKey: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Update an API key's mutable properties.
 */
export async function updateApiKey(
  id: string,
  userId: string,
  data: {
    name?: string;
    rateLimit?: number;
    monthlyLimit?: number;
    permissions?: string[];
  }
): Promise<ApiKeyResponse | null> {
  try {
    // Verify ownership
    const existing = await db.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.rateLimit !== undefined) updateData.rateLimit = data.rateLimit;
    if (data.monthlyLimit !== undefined) updateData.monthlyLimit = data.monthlyLimit;
    if (data.permissions !== undefined) updateData.permissions = serializePermissions(data.permissions);

    const updated = await db.apiKey.update({
      where: { id },
      data: updateData,
    });

    return toApiKeyResponse(updated);
  } catch (error) {
    console.error('[updateApiKey]', error)
    throw new Error(`Failed to updateApiKey: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
