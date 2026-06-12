# API Key Builder Agent - Task 3

## Task: Build the complete API key management system

## Files Created

1. **`/src/lib/api-keys.ts`** — API key service layer
   - `createApiKey()` — Generate and store new key, return raw key only once
   - `listApiKeys()` — List all keys for user (never keyHash)
   - `getApiKey()` — Get single key with ownership check
   - `revokeApiKey()` — Soft-delete with reason tracking
   - `rotateApiKey()` — Revoke old + create new with same settings
   - `validateApiKeyAccess()` — Full validation (exists, not revoked, not expired, monthly limit, usage tracking)
   - `resetMonthlyUsage()` — Reset all counters (cron)
   - `getApiKeyUsage()` — Daily aggregated usage stats
   - `deleteApiKey()` — Hard delete
   - `updateApiKey()` — Update mutable properties
   - Types: CreateApiKeyInput, ApiKeyResponse, CreateApiKeyResult, ValidateApiKeyResult, ApiKeyUsageStat
   - Helpers: parsePermissions/serializePermissions, toApiKeyResponse

2. **`/src/app/api/keys/route.ts`** — List and Create endpoints
   - GET: List all API keys for authenticated user
   - POST: Create new key with validation + plan limit enforcement

3. **`/src/app/api/keys/[id]/route.ts`** — Single key operations
   - GET: Get single key details
   - DELETE: Revoke (default) or hard delete (?hard=true)
   - PATCH: Update name, rateLimit, monthlyLimit, permissions

4. **`/src/app/api/keys/[id]/rotate/route.ts`** — Key rotation
   - POST: Revoke old, create new with same settings, return raw key

5. **`/src/app/api/keys/[id]/usage/route.ts`** — Usage statistics
   - GET: Daily aggregated stats with summary, configurable days param

## Key Decisions

- **Service layer pattern**: Business logic in `/src/lib/api-keys.ts`, route handlers thin
- **Raw key security**: Never stored in DB (only SHA-256 hash), returned only on creation/rotation
- **Permissions**: Stored as JSON array string in the `permissions` String column, parsed/serialized with helpers
- **Monthly usage reset**: Detected by comparing updatedAt month/year, auto-resets on first request of new month
- **Plan limits**: POST /api/keys checks subscription plan's apiKeysLimit before creating
- **Ownership enforcement**: All operations verify userId matches before any action
- **Fire-and-forget updates**: lastUsedAt and monthlyUsage updates don't block the response
- **Hard vs soft delete**: DELETE defaults to revoke (soft), use ?hard=true for permanent deletion
- **Usage stats**: Aggregated from UsageEvent model by date, includes summary with byEventType breakdown

## Verification

- ✅ Lint passes with no errors
- ✅ All endpoints return 401 for unauthenticated requests
- ✅ Dev server compiles without errors
- ✅ No unused imports
