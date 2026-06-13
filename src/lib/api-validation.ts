// API input validation using Zod schemas
// Centralizes all request validation logic to prevent invalid/malicious input

import { z } from 'zod';
import { KNOWLEDGE_CATEGORIES } from '@/types/knowledge';

// ─── Validation Helper ─────────────────────────────────────────────────────

/**
 * Validate data against a Zod schema.
 * Returns typed data on success, or a formatted error string on failure.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { data: T; error?: never } | { error: string; data?: never } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data };
  }
  // Format Zod errors into a single readable string
  const formatted = result.error.issues
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
  return { error: formatted };
}

// ─── Knowledge API Schemas ────────────────────────────────────────────────

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, 'query is required'),
  limit: z.number().int().min(1).max(50).default(5),
  minScore: z.number().min(0).max(1).default(0.1),
  category: z.string().optional(),
  workspaceId: z.string().optional(),
});

export const contextSchema = z.object({
  query: z.string().min(1, 'query is required'),
  maxDocuments: z.number().int().min(1).max(20).default(5),
  maxTokenBudget: z.number().int().min(100).max(50000).default(5000),
  category: z.string().optional(),
  sections: z.array(z.string()).optional(),
  workspaceId: z.string().optional(),
});

export const ingestSchema = z.object({
  category: z.string().min(1, 'category is required'),
  knowledgeBasePath: z.string().min(1, 'knowledgeBasePath is required'),
});

export const similarSchema = z.object({
  id: z.string().min(1, 'id is required'),
  limit: z.number().int().min(1).max(20).default(5),
});

export const updateKnowledgeSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  intents: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  antiPatterns: z.array(z.string()).optional(),
  implementationSteps: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  examples: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
  references: z.array(z.string()).optional(),
});

export const createKnowledgeSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
  title: z.string().min(1, 'title is required'),
  category: z.string().min(1, 'category is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  intents: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  antiPatterns: z.array(z.string()).optional(),
  implementationSteps: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  examples: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
  references: z.array(z.string()).optional(),
  schemaVersion: z.string().optional(),
  workspaceId: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// ─── Analytics Schema ─────────────────────────────────────────────────────

export const trackEventSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  eventType: z.string().min(1, 'eventType is required'),
  apiKeyId: z.string().optional(),
  workspaceId: z.string().optional(),
  toolName: z.string().optional(),
  knowledgeId: z.string().optional(),
  query: z.string().optional(),
  durationMs: z.number().int().min(0).optional(),
  tokensUsed: z.number().int().min(0).optional(),
  tokenSaved: z.number().int().min(0).optional(),
  success: z.boolean().optional(),
  errorMessage: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

// ─── Workspace Schemas ────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name must be 100 characters or less'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
}).refine(
  (data) => data.name !== undefined || data.description !== undefined || data.icon !== undefined,
  { message: 'At least one field (name, description, icon) must be provided' }
);

export const addMemberSchema = z.object({
  email: z.string().email('A valid email is required'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export const changeRoleSchema = z.object({
  memberId: z.string().min(1, 'memberId is required'),
  role: z.enum(['admin', 'member', 'viewer'], { message: 'Invalid role. Must be one of: admin, member, viewer' }),
});

// ─── Plan Schema ──────────────────────────────────────────────────────────

export const upgradePlanSchema = z.object({
  planName: z.enum(['free', 'pro', 'ultra', 'enterprise'], {
    message: 'Invalid plan name. Valid plans: free, pro, ultra, enterprise',
  }),
});

// ─── Seed Schema ──────────────────────────────────────────────────────────

export const seedIngestSchema = z.object({
  ingest: z.union([z.string(), z.boolean()]).optional(),
  category: z.string().optional(),
});

/**
 * Validate that a category string is a known knowledge category.
 */
export function isValidKnowledgeCategory(category: string): boolean {
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(category);
}
