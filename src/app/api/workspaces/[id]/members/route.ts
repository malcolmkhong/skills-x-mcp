// API: Manage workspace members (list, add, remove, update role)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  listWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
} from '@/lib/workspaces';
import { db } from '@/lib/db';
import { safeParseBody } from '@/lib/api-error';

/**
 * GET - List all members of a workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId } = await params;
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const members = await listWorkspaceMembers(workspaceId, user.id);
    if (!members) {
      return NextResponse.json(
        { error: 'Workspace not found or you are not a member' },
        { status: 404 }
      );
    }

    return NextResponse.json({ members });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST - Add a new member to the workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId } = await params;
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Member email is required' },
        { status: 400 }
      );
    }

    // Check team member limit based on plan
    const plan = user.plan || 'free';
    const memberLimits: Record<string, number> = {
      free: 1,
      pro: 10,
      ultra: 50,
      enterprise: -1, // unlimited
    };
    const limit = memberLimits[plan] ?? 1;

    if (limit !== -1) {
      const currentMembers = await db.workspaceMember.count({
        where: { workspaceId },
      });

      if (currentMembers >= limit) {
        return NextResponse.json(
          { error: `Team member limit reached (${limit} for ${plan} plan). Upgrade to add more members.` },
          { status: 403 }
        );
      }
    }

    const member = await addWorkspaceMember(workspaceId, user.id, email, role);
    if (!member) {
      return NextResponse.json(
        { error: 'Workspace not found or you are not a member' },
        { status: 404 }
      );
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.includes('Only workspace owners')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes('User not found') || message.includes('already a member')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes('Invalid role')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE - Remove a member from the workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId } = await params;
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId query parameter is required' },
        { status: 400 }
      );
    }

    const removed = await removeWorkspaceMember(workspaceId, user.id, memberId);
    if (!removed) {
      return NextResponse.json(
        { error: 'Member not found or you are not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.includes('Cannot remove') || message.includes('Only workspace')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH - Update a member's role in the workspace
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId } = await params;
    
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
    const { memberId, role } = body;

    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      );
    }

    const updated = await updateMemberRole(workspaceId, user.id, memberId, role);
    if (!updated) {
      return NextResponse.json(
        { error: 'Member not found or you are not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ member: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.includes('Only workspace') || message.includes('Cannot change')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes('Invalid role')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
