// Standardized API error response utility
// Prevents leaking internal error details to clients

import { NextResponse } from "next/server";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Return a structured JSON error response.
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string
) {
  return NextResponse.json(
    { error: message, ...(code && { code }) },
    { status }
  );
}

/**
 * Handle an unknown error from an API route.
 * Logs the full error server-side, but returns a sanitized message to the client.
 *
 * - If the error is a known "not found" Error, returns 404 with the message.
 * - In development, returns the actual error message for debugging.
 * - In production, returns a generic message to avoid leaking internals.
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse {
  // Log full error server-side for debugging
  console.error(`[${context || "API"}]`, error);

  // Known "not found" errors are safe to surface
  if (error instanceof Error && error.message.includes("not found")) {
    return apiError(error.message, 404);
  }

  // Known "Authentication required" errors
  if (error instanceof Error && error.message === "Authentication required") {
    return apiError("Authentication required", 401);
  }

  // In development, expose error message for easier debugging
  const message =
    IS_DEV && error instanceof Error
      ? error.message
      : "An unexpected error occurred. Please try again.";

  return apiError(message, 500);
}

/**
 * Safely parse JSON from a NextRequest.
 * Returns { data } on success or { error: NextResponse } on failure.
 */
export async function safeParseBody(
  request: Request
): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const data = await request.json();
    return { data };
  } catch {
    return { error: apiError("Invalid JSON body", 400) };
  }
}
