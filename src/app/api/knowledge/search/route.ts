// API: Search knowledge using hybrid retrieval with intent matching
// Supports workspace-scoped search and analytics tracking
import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/knowledge/embedding';
import { hybridSearch, recordRetrieval } from '@/lib/knowledge/vectorSearch';
import { getAuthIdentity } from '@/lib/auth-utils';
import { trackEvent } from '@/lib/analytics';
import { validate, searchKnowledgeSchema } from '@/lib/api-validation';
import { handleApiError, apiError } from '@/lib/api-error';
import type { KnowledgeCategory } from '@/types/knowledge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Get auth identity if available
    const identity = await getAuthIdentity(request.headers);
    userId = identity?.userId;
    workspaceId = identity?.method === 'apikey' ? identity.apiKey.workspaceId ?? undefined : undefined;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }
    const validation = validate(searchKnowledgeSchema, body);

    if (validation.error) {
      return apiError(validation.error, 400);
    }

    const { query, limit, minScore, category, workspaceId: bodyWorkspaceId } = validation.data;

    // Use workspaceId from body if provided, otherwise from API key context
    const effectiveWorkspaceId = bodyWorkspaceId || workspaceId;

    // If workspaceId is specified, verify the user is a member
    if (effectiveWorkspaceId && userId) {
      const { db } = await import('@/lib/db');
      const membership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: effectiveWorkspaceId,
            userId,
          },
        },
      });
      if (!membership) {
        return apiError('You are not a member of this workspace', 403);
      }
    }
    
    // Generate embedding for the query
    const queryEmbedding = generateEmbedding(query);
    
    // Perform hybrid search
    const results = await hybridSearch(
      query,
      queryEmbedding,
      limit,
      category as KnowledgeCategory | undefined,
      undefined,
      minScore
    );
    
    // Record retrieval events
    for (const result of results) {
      await recordRetrieval(result.id, query, result.score).catch(() => {});
    }

    // Track search event in analytics
    if (userId) {
      trackEvent({
        userId,
        eventType: 'search',
        query,
        workspaceId: effectiveWorkspaceId,
        durationMs: Date.now() - startTime,
        success: true,
        knowledgeId: results.length > 0 ? results[0].id : undefined,
      });
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    // Track failed search event
    if (userId) {
      trackEvent({
        userId,
        eventType: 'search',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        workspaceId,
      });
    }
    return handleApiError(error, 'knowledge/search');
  }
}
