import { NextRequest, NextResponse } from "next/server";
import { trackEvent, type TrackEventInput } from "@/lib/analytics";
import { validateApiKeyFromHeaders } from "@/lib/auth-utils";
import { validate, trackEventSchema } from "@/lib/api-validation";
import { apiError, handleApiError, safeParseBody } from "@/lib/api-error";

/**
 * POST /api/analytics/track
 * Record a usage event. Can be called by the MCP server with an API key.
 * Body: TrackEventInput (validated with Zod)
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    // Validate with Zod schema
    const validation = validate(trackEventSchema, body);
    if (validation.error) {
      return apiError(validation.error, 400);
    }

    const validatedBody = validation.data;

    // If called with an API key, verify the key's userId matches the body userId
    // This prevents spoofing — the MCP server authenticates with its API key
    // and the userId must match the key owner
    const apiKeyRecord = await validateApiKeyFromHeaders(request.headers);
    if (apiKeyRecord) {
      // Ensure the API key belongs to the same user
      if (apiKeyRecord.userId !== validatedBody.userId) {
        return apiError("API key does not belong to the specified userId", 403);
      }
    }

    // Record the event (fire-and-forget)
    trackEvent(validatedBody as TrackEventInput);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "analytics/track");
  }
}
