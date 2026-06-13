// API: List all knowledge documents / Create new knowledge document
// Supports workspace filtering and user ownership tracking
import { NextRequest, NextResponse } from 'next/server';
import { listKnowledge, createKnowledge, parseDocumentFields } from '@/lib/knowledge/database';
import { getAuthIdentity } from '@/lib/auth-utils';
import { validate, createKnowledgeSchema } from '@/lib/api-validation';
import { handleApiError, apiError, safeParseBody } from '@/lib/api-error';
import type { KnowledgeCategory } from '@/types/knowledge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as KnowledgeCategory | null;
    const workspaceId = searchParams.get('workspaceId');

    // Get auth identity if available (non-blocking — works without auth for public knowledge)
    const identity = await getAuthIdentity(request.headers);
    const userId = identity?.userId;

    // If a workspaceId is specified, verify the user is a member
    if (workspaceId && userId) {
      const { db } = await import('@/lib/db');
      const membership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });
      if (!membership) {
        return apiError('You are not a member of this workspace', 403);
      }
    } else if (workspaceId && !userId) {
      // Unauthenticated user trying to access workspace knowledge
      return apiError('Authentication required to access workspace knowledge', 401);
    }

    const documents = await listKnowledge(
      category || undefined,
      false,
      workspaceId || undefined
    );
    
    // Parse JSON fields and strip embedding data
    const sanitized = documents.map(doc => parseDocumentFields(doc));
    
    return NextResponse.json({ documents: sanitized });
  } catch (error) {
    return handleApiError(error, 'knowledge/GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication for creating knowledge
    const identity = await getAuthIdentity(request.headers);
    if (!identity) {
      return apiError('Authentication required to create knowledge', 401);
    }

    const userId = identity.userId;
    if (!userId) {
      return apiError('User ID not found in session', 401);
    }

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const validation = validate(createKnowledgeSchema, body);

    if (validation.error) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // If workspaceId is provided, verify the user is a member with write access
    if (data.workspaceId) {
      const { db } = await import('@/lib/db');
      const membership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: data.workspaceId,
            userId,
          },
        },
      });
      if (!membership) {
        return apiError('You are not a member of this workspace', 403);
      }
      if (membership.role === 'viewer') {
        return apiError('Viewers cannot create knowledge in this workspace', 403);
      }
    }
    
    const document = await createKnowledge({
      slug: data.slug,
      title: data.title,
      category: data.category as KnowledgeCategory,
      description: data.description,
      tags: data.tags,
      intents: data.intents,
      dependencies: data.dependencies,
      antiPatterns: data.antiPatterns,
      implementationSteps: data.implementationSteps,
      rules: data.rules,
      examples: data.examples,
      references: data.references,
      schemaVersion: data.schemaVersion,
      workspaceId: data.workspaceId || null,
      createdBy: userId,
      isPublic: data.isPublic !== undefined ? data.isPublic : (data.workspaceId ? false : true),
    });
    
    // Track the creation event
    const { trackEvent } = await import('@/lib/analytics');
    trackEvent({
      userId,
      eventType: 'api_call',
      knowledgeId: document.id,
      workspaceId: data.workspaceId || undefined,
      success: true,
    });

    return NextResponse.json({ 
      document: parseDocumentFields(document)
    }, { status: 201 });
  } catch (error) {
    // Surface known "unique constraint" errors as 409
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return apiError('A document with this slug already exists', 409);
    }
    return handleApiError(error, 'knowledge/POST');
  }
}
