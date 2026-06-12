// API: List all knowledge documents / Create new knowledge document
// Supports workspace filtering and user ownership tracking
import { NextRequest, NextResponse } from 'next/server';
import { listKnowledge, createKnowledge, parseDocumentFields } from '@/lib/knowledge/database';
import { getAuthIdentity } from '@/lib/auth-utils';
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
        return NextResponse.json(
          { error: 'You are not a member of this workspace' },
          { status: 403 }
        );
      }
    } else if (workspaceId && !userId) {
      // Unauthenticated user trying to access workspace knowledge
      return NextResponse.json(
        { error: 'Authentication required to access workspace knowledge' },
        { status: 401 }
      );
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication for creating knowledge
    const identity = await getAuthIdentity(request.headers);
    if (!identity) {
      return NextResponse.json(
        { error: 'Authentication required to create knowledge' },
        { status: 401 }
      );
    }

    const userId = identity.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      slug, title, category, description, tags, intents, dependencies,
      antiPatterns, implementationSteps, rules, examples, references,
      schemaVersion, workspaceId, isPublic,
    } = body;
    
    if (!slug || !title || !category) {
      return NextResponse.json(
        { error: 'slug, title, and category are required' },
        { status: 400 }
      );
    }

    // If workspaceId is provided, verify the user is a member with write access
    if (workspaceId) {
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
        return NextResponse.json(
          { error: 'You are not a member of this workspace' },
          { status: 403 }
        );
      }
      if (membership.role === 'viewer') {
        return NextResponse.json(
          { error: 'Viewers cannot create knowledge in this workspace' },
          { status: 403 }
        );
      }
    }
    
    const document = await createKnowledge({
      slug,
      title,
      category,
      description,
      tags,
      intents,
      dependencies,
      antiPatterns,
      implementationSteps,
      rules,
      examples,
      references,
      schemaVersion,
      workspaceId: workspaceId || null,
      createdBy: userId,
      isPublic: isPublic !== undefined ? isPublic : (workspaceId ? false : true),
    });
    
    // Track the creation event
    const { trackEvent } = await import('@/lib/analytics');
    trackEvent({
      userId,
      eventType: 'api_call',
      knowledgeId: document.id,
      workspaceId: workspaceId || undefined,
      success: true,
    });

    return NextResponse.json({ 
      document: parseDocumentFields(document)
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A document with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
