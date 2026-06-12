# Task 5: MCP Server Authentication, Rate Limiting, and Usage Tracking

## Summary
Enhanced the MCP server with API key authentication, per-session rate limiting, and usage tracking. Created supporting Next.js API endpoints and updated middleware.

## Files Created
1. `/src/app/api/keys/validate/route.ts` - Public API key validation endpoint
2. `/src/app/api/analytics/track/route.ts` - Usage tracking endpoint (accepts API key auth)

## Files Modified
1. `/mini-services/mcp-server/index.ts` - Added authentication, rate limiting, usage tracking
2. `/mini-services/mcp-server/tools.ts` - Added auth context, permission checks, usage tracking per tool call
3. `/mini-services/mcp-server/api-client.ts` - Added auth headers, key validation, usage tracking functions
4. `/src/middleware.ts` - Added auth-optional routes for MCP unauthenticated access

## Key Changes

### MCP Server (index.ts)
- **Authentication**: API key extracted from SSE query (`/sse?apiKey=ixk_xxxxx`) or Authorization header on `/messages`
- **Key validation**: Calls `GET /api/keys/validate?apiKey=...` to validate against the Next.js database
- **Auth context stored with SSE session**: Each session tracks userId, apiKeyId, permissions, plan
- **Session upgrade**: Unauthenticated sessions can be upgraded when API key provided in messages
- **Rate limiting**: 60 req/min authenticated, 10 req/min unauthenticated (sliding window)
- **Usage tracking**: Logs all tool calls with duration and success/failure
- **Health endpoint**: Now shows authentication methods, rate limits, and authenticated connection count

### MCP Server (tools.ts)
- **Permission checks**: Admin tools require admin/write permissions; read tools available to all
- **Auth context passed**: Each tool call receives the session's auth context
- **API key forwarded**: Auth context's API key is included in Authorization header when proxying to Next.js
- **Usage tracking**: After each tool call, tracks duration, success, and error info via `trackUsage()`

### MCP Server (api-client.ts)
- **AuthContext type**: Stores apiKey, userId, apiKeyId, permissions, plan, workspaceId, rateLimit, monthlyLimit, monthlyUsage
- **Auth headers**: All API requests include `Authorization: Bearer ixk_xxxxx` when auth context is available
- **validateApiKey()**: Calls Next.js validation endpoint
- **trackUsage()**: Fire-and-forget usage tracking to Next.js analytics API
- **Health check**: Changed from `/api/knowledge/stats` to `/api/health` (public endpoint)

### Middleware (middleware.ts)
- **Added `/api/analytics` to MCP_API_ROUTES**: Allows API key auth on analytics endpoints
- **Added `/api/keys/validate` to EXACT_PUBLIC_ROUTES**: Public endpoint for key validation
- **Added AUTH_OPTIONAL_ROUTES**: Knowledge search, context endpoints accessible without auth
- **Added isKnowledgeReadRoute()**: GET /api/knowledge and /api/knowledge/{id} accessible without auth
- **Purpose**: MCP server needs to call knowledge APIs for unauthenticated clients

### API: /api/keys/validate (GET)
- Query param: `apiKey` - The raw API key to validate
- Returns: `{ valid: true, userId, apiKeyId, permissions, plan, ... }` or `{ valid: false, error }`
- Public endpoint (no auth required)

### API: /api/analytics/track (POST)
- Body: Same as TrackEventInput type
- Accepts API key auth via Authorization header
- Validates that API key's userId matches the body's userId (prevents spoofing)
- Returns: `{ success: true }`

## Testing Results
- ✅ API key validation endpoint works (valid, invalid, missing keys)
- ✅ Analytics track endpoint works with API key auth
- ✅ Analytics track rejects mismatched userId (403)
- ✅ MCP server health check shows new auth/rate info
- ✅ Unauthenticated MCP tool calls work (search, retrieve, context)
- ✅ Authenticated MCP tool calls work (SSE with ?apiKey=)
- ✅ Authenticated requests forward API key to Next.js API
- ✅ Rate limiting works (10/min unauthenticated, blocked after 10th request)
- ✅ Permission checks work (admin tools blocked without auth)
- ✅ Lint passes with no errors
