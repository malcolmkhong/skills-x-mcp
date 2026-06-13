import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
  "/api/plans",
  "/api/keys/validate",
];

// Auth-optional routes: accessible without auth, but if API key is provided it will be processed.
const AUTH_OPTIONAL_ROUTES = [
  "/api/knowledge/search",
  "/api/knowledge/context",
];

/**
 * Validate API key format (starts with ixk_ and has sufficient length)
 */
function isValidApiKeyFormat(key: string): boolean {
  return /^ixk_[0-9a-f]{16,}$/.test(key);
}

/**
 * Check if a route is a knowledge read-by-ID route (GET /api/knowledge/[id])
 */
function isKnowledgeReadRoute(pathname: string, method: string): boolean {
  if (method !== "GET") return false;
  if (pathname === "/api/knowledge") return true;
  if (pathname.startsWith("/api/knowledge/")) {
    const suffix = pathname.slice("/api/knowledge/".length);
    if (!suffix.includes("/") && !["search", "context", "stats", "ingest", "rebuild", "similar"].includes(suffix)) {
      return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ─── Refresh Supabase auth session on every request ───────────────
  // This ensures the Supabase cookies are always up to date.
  const { response, user: supabaseUser } = await updateSession(request);

  // Only apply auth checks to API routes
  if (!pathname.startsWith("/api/")) {
    return response;
  }

  // Allow public API routes (prefix match)
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // Allow exact public routes
  if (EXACT_PUBLIC_ROUTES.some((route) => pathname === route)) {
    return response;
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
      const apiKey = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      if (isValidApiKeyFormat(apiKey)) {
        response.headers.set("x-api-key", apiKey);
        response.headers.set("x-api-key-prefix", apiKey.slice(0, 8));
        return response;
      }
    }
  }

  // Auth-optional routes: allow through even without auth
  if (isAuthOptional) {
    return response;
  }

  // Check for Supabase authenticated user (set by updateSession)
  if (supabaseUser) {
    // Authenticated via Supabase session
    return response;
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
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (Supabase auth callback)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
