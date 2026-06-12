// IndustryX Knowledge MCP Server - AI-Native JSON Knowledge Unit Types
// Every knowledge unit follows a strict schema optimized for AI retrieval,
// MCP integration, vector search, and automated context assembly.

import { z } from 'zod';

// ─── Knowledge Categories ──────────────────────────────────────────────────────

export const KNOWLEDGE_CATEGORIES = [
  'skills',
  'design-systems',
  'sops',
  'architecture',
  'security',
  'economy',
  'deployment',
  'ui-standards',
  'backend-standards',
  'frontend-standards',
  'game-economy',
  'trading',
  'marketplace',
  'anti-cheat',
  'analytics',
  'liveops',
  'premium',
  'monetization',
  'cloud-save',
  'offline-sync',
] as const;

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

// ─── JSON Knowledge Unit Schema (Zod) ──────────────────────────────────────────

export const KnowledgeExampleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const KnowledgeMetadataSchema = z.object({
  version: z.string().default('1.0.0'),
  updated_at: z.string().default(() => new Date().toISOString().split('T')[0]),
});

export const KnowledgeUnitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).min(1),
  intents: z.array(z.string()).min(1),
  dependencies: z.array(z.string()).default([]),
  anti_patterns: z.array(z.string()).default([]),
  implementation_steps: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  examples: z.array(KnowledgeExampleSchema).default([]),
  references: z.array(z.string()).default([]),
  metadata: KnowledgeMetadataSchema.default({ version: '1.0.0', updated_at: new Date().toISOString().split('T')[0] }),
});

export type KnowledgeUnit = z.infer<typeof KnowledgeUnitSchema>;
export type KnowledgeExample = z.infer<typeof KnowledgeExampleSchema>;
export type KnowledgeMetadata = z.infer<typeof KnowledgeMetadataSchema>;

// ─── Validate a knowledge unit ─────────────────────────────────────────────────

export function validateKnowledgeUnit(data: unknown): { success: boolean; data?: KnowledgeUnit; errors?: z.ZodError } {
  const result = KnowledgeUnitSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// ─── Database Document Types ───────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  tags: string[];
  intents: string[];
  dependencies: string[];
  antiPatterns: string[];
  implementationSteps: string[];
  rules: string[];
  examples: KnowledgeExample[];
  references: string[];
  embedding: number[];
  version: number;
  accessCount: number;
  relevanceScore: number;
  isActive: boolean;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeCreateInput {
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description?: string;
  tags?: string[];
  intents?: string[];
  dependencies?: string[];
  antiPatterns?: string[];
  implementationSteps?: string[];
  rules?: string[];
  examples?: KnowledgeExample[];
  references?: string[];
  schemaVersion?: string;
}

export interface KnowledgeUpdateInput {
  title?: string;
  category?: KnowledgeCategory;
  description?: string;
  tags?: string[];
  intents?: string[];
  dependencies?: string[];
  antiPatterns?: string[];
  implementationSteps?: string[];
  rules?: string[];
  examples?: KnowledgeExample[];
  references?: string[];
}

// ─── Search Types ──────────────────────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  limit?: number;
  category?: KnowledgeCategory;
  minScore?: number;
  section?: 'all' | 'rules' | 'steps' | 'anti_patterns' | 'intents';
}

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  tags: string[];
  intents: string[];
  score: number;
}

export interface HybridSearchResult extends SearchResult {
  embeddingScore: number;
  keywordScore: number;
  categoryScore: number;
  intentScore: number;
  usageWeight: number;
}

// ─── Context Builder Types ─────────────────────────────────────────────────────

export interface ContextBuildRequest {
  query: string;
  maxDocuments?: number;
  maxTokenBudget?: number;
  category?: KnowledgeCategory;
  sections?: Array<'rules' | 'steps' | 'anti_patterns' | 'dependencies' | 'examples'>;
}

export interface ContextBuildResponse {
  context: string;
  documentsUsed: number;
  totalTokens: number;
  sources: Array<{
    slug: string;
    title: string;
    category: KnowledgeCategory;
    score: number;
  }>;
}

// ─── Ingestion Types ───────────────────────────────────────────────────────────

export interface IngestionResult {
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

export interface JsonKnowledgeFile {
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  tags: string[];
  intents: string[];
  dependencies: string[];
  anti_patterns: string[];
  implementation_steps: string[];
  rules: string[];
  examples: KnowledgeExample[];
  references: string[];
  metadata: KnowledgeMetadata;
}

// ─── MCP Tool Types ────────────────────────────────────────────────────────────

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// ─── Statistics Types ──────────────────────────────────────────────────────────

export interface KnowledgeStats {
  totalDocuments: number;
  documentsByCategory: Record<string, number>;
  totalRetrievals: number;
  topAccessed: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    accessCount: number;
  }>;
  recentIngestions: Array<{
    id: string;
    operation: string;
    category: string | null;
    documentsProcessed: number;
    status: string;
    startedAt: string;
    completedAt: string | null;
  }>;
}

// ─── Embedding Service Types ───────────────────────────────────────────────────

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// ─── Vector Search Types ───────────────────────────────────────────────────────

export interface VectorSearchResult {
  id: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  score: number;
}

// ─── Hybrid Retrieval Weights ─────────────────────────────────────────────────

export interface RetrievalWeights {
  embedding: number;
  keyword: number;
  category: number;
  intent: number;
  usage: number;
}

export const DEFAULT_RETRIEVAL_WEIGHTS: RetrievalWeights = {
  embedding: 0.40,
  keyword: 0.20,
  category: 0.15,
  intent: 0.15,
  usage: 0.10,
};
