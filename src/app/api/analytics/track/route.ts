import { NextRequest, NextResponse } from "next/server";
import { trackEvent, type TrackEventInput } from "@/lib/analytics";
import { validateApiKeyFromHeaders } from "@/lib/auth-utils";

/**
 * POST /api/analytics/track
 * Record a usage event. Can be called by the MCP server with an API key.
 * Body: TrackEventInput
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrackEventInput;

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    if (!body.eventType) {
      return NextResponse.json(
        { error: "Missing required field: eventType" },
        { status: 400 }
      );
    }

    // If called with an API key, verify the key's userId matches the body userId
    // This prevents spoofing — the MCP server authenticates with its API key
    // and the userId must match the key owner
    const apiKeyRecord = await validateApiKeyFromHeaders(request.headers);
    if (apiKeyRecord) {
      // Ensure the API key belongs to the same user
      if (apiKeyRecord.userId !== body.userId) {
        return NextResponse.json(
          { error: "API key does not belong to the specified userId" },
          { status: 403 }
        );
      }
    }

    // Record the event (fire-and-forget)
    trackEvent(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Analytics track error:", error);
    return NextResponse.json(
      { error: "Failed to record usage event" },
      { status: 500 }
    );
  }
}
