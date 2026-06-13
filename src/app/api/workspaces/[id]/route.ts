// API: Get/Update/Delete a single workspace
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getWorkspace, updateWorkspace, deleteWorkspace } from '@/lib/workspaces';
import { db } from '@/lib/db';
import { safeParseBody } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await getWorkspace(id, user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or you are not a member' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const { name, description, icon } = body;

    // Validate at least one field is provided
    if (name === undefined && description === undefined && icon === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name, description, icon) must be provided' },
        { status: 400 }
      );
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Workspace name must be a non-empty string' },
        { status: 400 }
      );
    }

    if (name !== undefined && name.length > 100) {
      return NextResponse.json(
        { error: 'Workspace name must be 100 characters or less' },
        { status: 400 }
      );
    }

    const workspace = await updateWorkspace(id, user.id, {
      name: name !== undefined ? name.trim() : undefined,
      description,
      icon,
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or you are not a member' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.includes('Only workspace owners')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleted = await deleteWorkspace(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Workspace not found or you are not a member' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.includes('Only the workspace owner')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes('Cannot delete personal workspace')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
