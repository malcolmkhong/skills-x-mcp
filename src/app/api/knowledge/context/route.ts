// API: Build context for AI agent from structured JSON knowledge units
// Includes analytics tracking for context build events
import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/knowledge/contextBuilder';
import { getAuthIdentity } from '@/lib/auth-utils';
import { trackEvent } from '@/lib/analytics';
import { validate, contextSchema } from '@/lib/api-validation';
import { handleApiError, apiError, safeParseBody } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Get auth identity if available
    const identity = await getAuthIdentity(request.headers);
    userId = identity?.userId;
    workspaceId = identity?.method === 'apikey' ? identity.apiKey.workspaceId ?? undefined : undefined;

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const validation = validate(contextSchema, body);

    if (validation.error) {
      return apiError(validation.error, 400);
    }

    const { query, maxDocuments, maxTokenBudget, category, sections, workspaceId: bodyWorkspaceId } = validation.data;

    // Use workspaceId from body if provided, otherwise from API key context
    const effectiveWorkspaceId = bodyWorkspaceId || workspaceId;
    
    const result = await buildContext({
      query,
      maxDocuments,
      maxTokenBudget,
      category,
      sections: sections as Array<'rules' | 'steps' | 'anti_patterns' | 'dependencies' | 'examples'> | undefined,
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
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        workspaceId,
      });
    }
    return handleApiError(error, 'knowledge/context');
  }
}
