// API: List user's workspaces / Create a new workspace
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { listWorkspaces, createWorkspace } from '@/lib/workspaces';
import { db } from '@/lib/db';
import { safeParseBody } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await requireAuth();
    
    // Get user ID from session email
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspaces = await listWorkspaces(user.id);
    return NextResponse.json({ workspaces });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    
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
    const { name, description, icon } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Workspace name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Check workspace limit based on plan
    const plan = user.plan || 'free';
    const workspaceLimits: Record<string, number> = {
      free: 1,
      pro: 5,
      ultra: 50,
      enterprise: -1, // unlimited
    };
    const limit = workspaceLimits[plan] ?? 1;

    if (limit !== -1) {
      const currentWorkspaces = await db.workspaceMember.count({
        where: {
          userId: user.id,
          role: 'owner',
        },
      });

      if (currentWorkspaces >= limit) {
        return NextResponse.json(
          { error: `Workspace limit reached (${limit} for ${plan} plan). Upgrade to create more workspaces.` },
          { status: 403 }
        );
      }
    }

    const workspace = await createWorkspace(user.id, {
      name: name.trim(),
      description,
      icon,
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
