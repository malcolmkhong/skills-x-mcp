// API: Build context for AI agent from structured JSON knowledge units
// Includes analytics tracking for context build events
import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/knowledge/contextBuilder';
import { getAuthIdentity } from '@/lib/auth-utils';
import { trackEvent } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Get auth identity if available
    const identity = await getAuthIdentity(request.headers);
    userId = identity?.userId;
    workspaceId = identity?.method === 'apikey' ? identity.apiKey.workspaceId ?? undefined : undefined;

    const body = await request.json();
    const { query, maxDocuments = 5, maxTokenBudget = 5000, category, sections, workspaceId: bodyWorkspaceId } = body;
    
    // Use workspaceId from body if provided, otherwise from API key context
    const effectiveWorkspaceId = bodyWorkspaceId || workspaceId;

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    
    const result = await buildContext({
      query,
      maxDocuments,
      maxTokenBudget,
      category,
      sections,
    });

    // Track context build event in analytics
    if (userId) {
      trackEvent({
        userId,
        eventType: 'context_build',
        query,
        workspaceId: effectiveWorkspaceId,
        durationMs: Date.now() - startTime,
        tokensUsed: result.totalTokens,
        tokenSaved: Math.max(0, maxTokenBudget - result.totalTokens),
        success: true,
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    // Track failed context build event
    if (userId) {
      trackEvent({
        userId,
        eventType: 'context_build',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        workspaceId,
      });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
