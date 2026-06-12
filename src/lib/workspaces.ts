// IndustryX Knowledge MCP Platform - Workspace Management Service
// Full CRUD operations for workspaces with membership management

import { db } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  isPersonal: boolean;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  currentUserRole?: string;
}

export interface WorkspaceMemberResponse {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  role: string;
  joinedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  icon?: string;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Create a new workspace with the user as owner.
 * Also creates a WorkspaceMember record with role "owner".
 */
export async function createWorkspace(
  userId: string,
  data: CreateWorkspaceInput
): Promise<WorkspaceResponse> {
  const slug = await generateUniqueSlug(data.name);

  const workspace = await db.workspace.create({
    data: {
      name: data.name,
      slug,
      description: data.description || '',
      icon: data.icon || null,
      isPersonal: false,
      plan: 'free',
      members: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    icon: workspace.icon,
    isPersonal: workspace.isPersonal,
    plan: workspace.plan,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    memberCount: 1,
    currentUserRole: 'owner',
  };
}

/**
 * List all workspaces the user is a member of.
 * Includes the user's role and member count for each workspace.
 */
export async function listWorkspaces(userId: string): Promise<WorkspaceResponse[]> {
  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          members: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    description: m.workspace.description,
    icon: m.workspace.icon,
    isPersonal: m.workspace.isPersonal,
    plan: m.workspace.plan,
    createdAt: m.workspace.createdAt,
    updatedAt: m.workspace.updatedAt,
    memberCount: m.workspace.members.length,
    currentUserRole: m.role,
  }));
}

/**
 * Get a workspace by ID, ensuring the user is a member.
 * Returns workspace details with the user's role.
 */
export async function getWorkspace(
  id: string,
  userId: string
): Promise<WorkspaceResponse & { members: WorkspaceMemberResponse[] } | null> {
  // Check membership first
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: id,
        userId,
      },
    },
  });

  if (!membership) return null;

  const workspace = await db.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    icon: workspace.icon,
    isPersonal: workspace.isPersonal,
    plan: workspace.plan,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    memberCount: workspace.members.length,
    currentUserRole: membership.role,
    members: workspace.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      userEmail: m.user.email,
      userImage: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  };
}

/**
 * Update a workspace. Only owner or admin can update.
 */
export async function updateWorkspace(
  id: string,
  userId: string,
  data: UpdateWorkspaceInput
): Promise<WorkspaceResponse | null> {
  // Check membership and role
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: id,
        userId,
      },
    },
  });

  if (!membership) return null;
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new Error('Only workspace owners and admins can update the workspace');
  }

  // Generate new slug if name is being changed
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = await generateUniqueSlug(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;

  const workspace = await db.workspace.update({
    where: { id },
    data: updateData,
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    icon: workspace.icon,
    isPersonal: workspace.isPersonal,
    plan: workspace.plan,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    currentUserRole: membership.role,
  };
}

/**
 * Delete a workspace. Only the owner can delete.
 * This cascades to delete all members and associated data.
 */
export async function deleteWorkspace(
  id: string,
  userId: string
): Promise<boolean> {
  // Check membership and role
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: id,
        userId,
      },
    },
  });

  if (!membership) return false;
  if (membership.role !== 'owner') {
    throw new Error('Only the workspace owner can delete the workspace');
  }

  // Don't allow deleting personal workspaces
  const workspace = await db.workspace.findUnique({ where: { id } });
  if (workspace?.isPersonal) {
    throw new Error('Cannot delete personal workspace');
  }

  await db.workspace.delete({ where: { id } });
  return true;
}

/**
 * Add a member to a workspace by email.
 * Only owner or admin can add members.
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  newMemberEmail: string,
  role: string = 'member'
): Promise<WorkspaceMemberResponse | null> {
  // Check if the actor has permission
  const actorMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!actorMembership) return null;
  if (actorMembership.role !== 'owner' && actorMembership.role !== 'admin') {
    throw new Error('Only workspace owners and admins can add members');
  }

  // Validate role
  const validRoles = ['admin', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Find the user by email
  const newMember = await db.user.findUnique({
    where: { email: newMemberEmail },
  });

  if (!newMember) {
    throw new Error('User not found with this email address');
  }

  // Check if already a member
  const existingMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: newMember.id,
      },
    },
  });

  if (existingMembership) {
    throw new Error('User is already a member of this workspace');
  }

  // Add the member
  const member = await db.workspaceMember.create({
    data: {
      workspaceId,
      userId: newMember.id,
      role,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return {
    id: member.id,
    userId: member.userId,
    userName: member.user.name,
    userEmail: member.user.email,
    userImage: member.user.image,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

/**
 * Remove a member from a workspace.
 * Only owner or admin can remove members.
 * Cannot remove the owner.
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string,
  memberId: string
): Promise<boolean> {
  // Check if the actor has permission
  const actorMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!actorMembership) return false;
  if (actorMembership.role !== 'owner' && actorMembership.role !== 'admin') {
    throw new Error('Only workspace owners and admins can remove members');
  }

  // Find the member to remove
  const memberToRemove = await db.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!memberToRemove || memberToRemove.workspaceId !== workspaceId) {
    return false;
  }

  // Cannot remove the owner
  if (memberToRemove.role === 'owner') {
    throw new Error('Cannot remove the workspace owner. Transfer ownership first.');
  }

  // Admins cannot remove other admins (only owner can)
  if (memberToRemove.role === 'admin' && actorMembership.role === 'admin') {
    throw new Error('Admins cannot remove other admins. Only the owner can.');
  }

  await db.workspaceMember.delete({ where: { id: memberId } });
  return true;
}

/**
 * Update a member's role in a workspace.
 * Only owner can change roles. Owner role cannot be transferred this way.
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  memberId: string,
  role: string
): Promise<WorkspaceMemberResponse | null> {
  // Check if the actor has permission
  const actorMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!actorMembership) return null;
  if (actorMembership.role !== 'owner' && actorMembership.role !== 'admin') {
    throw new Error('Only workspace owners and admins can change member roles');
  }

  // Validate role
  const validRoles = ['admin', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Find the member to update
  const memberToUpdate = await db.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!memberToUpdate || memberToUpdate.workspaceId !== workspaceId) {
    return null;
  }

  // Cannot change the owner's role
  if (memberToUpdate.role === 'owner') {
    throw new Error('Cannot change the workspace owner\'s role');
  }

  // Admins can only change member/viewer roles, not other admins
  if (actorMembership.role === 'admin' && memberToUpdate.role === 'admin') {
    throw new Error('Admins cannot change other admins\' roles. Only the owner can.');
  }

  // Update the role
  const updated = await db.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    userName: updated.user.name,
    userEmail: updated.user.email,
    userImage: updated.user.image,
    role: updated.role,
    joinedAt: updated.joinedAt,
  };
}

/**
 * Check if a user is a member of a workspace.
 * Returns the membership record or null.
 */
export async function checkWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<{ role: string } | null> {
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { role: true },
  });

  return membership;
}

/**
 * List members of a workspace.
 * Requires the requesting user to be a member.
 */
export async function listWorkspaceMembers(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberResponse[] | null> {
  // Check membership
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!membership) return null;

  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    userEmail: m.user.email,
    userImage: m.user.image,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}
