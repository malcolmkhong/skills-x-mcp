// MCP Server: Authentication
// API key extraction and validation

import { validateApiKey, type AuthContext } from '../api-client';

/**
 * Extract API key from various sources:
 * 1. URL query parameter: ?apiKey=ixk_xxxxx
 * 2. Authorization header: Bearer ixk_xxxxx
 */
export function extractApiKey(req: Request, url: URL): string | null {
  const queryApiKey = url.searchParams.get('apiKey');
  if (queryApiKey) return queryApiKey;

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }

  return null;
}

/**
 * Validate an API key and return the auth context.
 * Returns null if no key provided or validation failed.
 */
export async function authenticate(apiKey: string | null): Promise<AuthContext | null> {
  if (!apiKey) return null;

  if (!/^ixk_[0-9a-f]{16,}$/.test(apiKey)) {
    console.log('[Auth] Invalid API key format, skipping validation');
    return null;
  }

  const result = await validateApiKey(apiKey);

  if (!result.valid) {
    console.log(`[Auth] API key validation failed: ${result.error}`);
    return null;
  }

  return {
    apiKey,
    userId: result.userId!,
    apiKeyId: result.apiKeyId!,
    permissions: result.permissions!,
    plan: result.plan!,
    workspaceId: result.workspaceId ?? null,
    rateLimit: result.rateLimit!,
    monthlyLimit: result.monthlyLimit!,
    monthlyUsage: result.monthlyUsage!,
  };
}
