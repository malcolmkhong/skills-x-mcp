# Auth Builder Agent - Task 2

## Task: Build the complete authentication system using NextAuth.js v4

## Files Created

1. **`/src/types/next-auth.d.ts`** - NextAuth type augmentation (role, plan fields in session)
2. **`/src/lib/auth.ts`** - NextAuth configuration with GitHub, Google, and demo credentials providers
3. **`/src/app/api/auth/[...nextauth]/route.ts`** - NextAuth API route handler
4. **`/src/lib/auth-utils.ts`** - Auth utility functions (hashApiKey, generateApiKey, verifyApiKey, validateApiKeyFromHeaders, getServerSession, requireAuth, getAuthIdentity)
5. **`/src/middleware.ts`** - Next.js middleware for route protection
6. **`/src/lib/seed.ts`** - Database seeder (demo user, workspace, plans, API key)
7. **`/src/app/api/seed/route.ts`** - Seed endpoint (POST /api/seed)
8. **`/src/app/api/health/route.ts`** - Health check endpoint

## Files Modified

1. **`/next.config.ts`** - Added `serverExternalPackages: ["@prisma/client", "prisma"]` to fix Turbopack + Prisma compatibility
2. **`/.env`** - Added NEXTAUTH_URL, NEXTAUTH_SECRET, GitHub OAuth, Google OAuth env vars

## Key Decisions

- **JWT strategy** with custom session callback to include role and plan
- **Demo credentials provider** (id: "demo") with simple password check (no bcrypt)
- **Middleware** checks for NextAuth JWT token OR API key format validation
- **API key format**: `ixk_` + 48 hex chars, validated by regex in middleware
- **PrismaAdapter** configured for OAuth providers (GitHub, Google)
- **getAuthIdentity()** helper for route handlers to check both session and API key auth
- **serverExternalPackages** fix was required for Turbopack + Prisma compatibility

## Test Results

- ✅ Health check: database connected
- ✅ Auth providers: GitHub, Google, Demo all configured
- ✅ CSRF token: working
- ✅ Unauthenticated access: blocked with 401
- ✅ API key auth: working on knowledge routes
- ✅ Session auth: working after demo sign-in
- ✅ Demo session: includes role=admin, plan=pro
- ✅ Seed endpoint: creates demo user, workspace, plans, API key
- ✅ Lint: passes
