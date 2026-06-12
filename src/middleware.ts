import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// MCP-related API routes that accept API key as alternative auth
const MCP_API_ROUTES = [
  "/api/knowledge",
  "/api/mcp",
  "/api/analytics",
];

// Public API routes that don't require authentication (prefix match)
const PUBLIC_API_ROUTES = [
  "/api/auth",
  "/api/health",
  "/api/seed",
];

// Exact public routes (must match exactly, not just prefix)
const EXACT_PUBLIC_ROUTES = [
  "/api/plans", // Plans listing is public so users can see pricing before signing up
  "/api/keys/validate", // Key validation is public — used by MCP server to validate keys
];

// Auth-optional routes: accessible without auth, but if API key is provided it will be processed.
// These are knowledge read endpoints that the MCP server calls for unauthenticated clients.
// The route handlers already handle the case where no identity is present.
const AUTH_OPTIONAL_ROUTES = [
  "/api/knowledge/search",
  "/api/knowledge/context",
];

/**
 * Validate API key format (starts with ixk_ and has sufficient length)
 */
function isValidApiKeyFormat(key: string): boolean {
  // API keys have format: ixk_ followed by at least 24 hex characters
  return /^ixk_[0-9a-f]{16,}$/.test(key);
}

/**
 * Check if a route is a knowledge read-by-ID route (GET /api/knowledge/[id])
 * These should also be auth-optional for MCP unauthenticated access.
 */
function isKnowledgeReadRoute(pathname: string, method: string): boolean {
  // GET /api/knowledge (list) and GET /api/knowledge/[id] (get single)
  if (method !== "GET") return false;
  if (pathname === "/api/knowledge") return true;
  // Match /api/knowledge/{id} but not /api/knowledge/search, /api/knowledge/context, etc.
  if (pathname.startsWith("/api/knowledge/")) {
    const suffix = pathname.slice("/api/knowledge/".length);
    // If it doesn't contain another slash and isn't a known sub-route, it's an ID
    if (!suffix.includes("/") && !["search", "context", "stats", "ingest", "rebuild", "similar"].includes(suffix)) {
      return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public API routes (prefix match)
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow exact public routes (exact match only)
  if (EXACT_PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // For auth-optional routes, check for API key but allow through without auth
  const isAuthOptional =
    AUTH_OPTIONAL_ROUTES.some((route) => pathname === route) ||
    isKnowledgeReadRoute(pathname, method);

  // Check for API key in Authorization header for MCP-related routes
  const isMcpRoute = MCP_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isMcpRoute) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      // Extract the API key from "Bearer ixk_..." format
      const apiKey = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      // Validate API key format before passing to route handler
      if (isValidApiKeyFormat(apiKey)) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-api-key", apiKey);
        requestHeaders.set("x-api-key-prefix", apiKey.slice(0, 8));

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }
  }

  // Auth-optional routes: allow through even without auth
  if (isAuthOptional) {
    return NextResponse.next();
  }

  // Check for NextAuth JWT token
  try {
    const token = await getToken({
      req: request,
      secret:
        process.env.NEXTAUTH_SECRET ||
        "industryx-dev-secret-change-in-production-2024",
    });

    if (token) {
      // Authenticated via session
      return NextResponse.next();
    }
  } catch {
    // Token verification failed, continue to unauthorized response
  }

  // Unauthenticated - return 401 for API routes
  return NextResponse.json(
    {
      error: "Unauthorized",
      message:
        "Authentication required. Sign in or provide a valid API key in the Authorization header.",
    },
    { status: 401 }
  );
}

export const config = {
  matcher: [
    /*
     * Match all API routes except:
     * - /api/auth (NextAuth routes)
     * - /api/health (health check)
     * - /api/seed (database seeder)
     */
    "/api/((?!auth|health|seed).*)",
  ],
};
