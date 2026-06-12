// IndustryX Knowledge MCP Server - Type Definitions

// Knowledge Categories
export const KNOWLEDGE_CATEGORIES = [
  'skills',
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

// Knowledge Document Types
export interface KnowledgeDocument {
  id: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  keywords: string[];
  markdownContent: string;
  embedding: number[];
  version: number;
  accessCount: number;
  relevanceScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeCreateInput {
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description?: string;
  keywords?: string[];
  markdownContent: string;
}

export interface KnowledgeUpdateInput {
  title?: string;
  category?: KnowledgeCategory;
  description?: string;
  keywords?: string[];
  markdownContent?: string;
}

// Search Types
export interface SearchRequest {
  query: string;
  limit?: number;
  category?: KnowledgeCategory;
  minScore?: number;
}

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  score: number;
}

export interface HybridSearchResult extends SearchResult {
  embeddingScore: number;
  keywordScore: number;
  categoryScore: number;
  usageWeight: number;
}

// Context Builder Types
export interface ContextBuildRequest {
  query: string;
  maxDocuments?: number;
  maxTokenBudget?: number;
  category?: KnowledgeCategory;
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

// Ingestion Types
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

export interface MarkdownMetadata {
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  keywords: string[];
}

// MCP Tool Types
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

// Statistics Types
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

// Embedding Service Types
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

// Vector Search Types
export interface VectorSearchResult {
  id: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  score: number;
}

// Hybrid Retrieval Weights
export interface RetrievalWeights {
  embedding: number;
  keyword: number;
  category: number;
  usage: number;
}

export const DEFAULT_RETRIEVAL_WEIGHTS: RetrievalWeights = {
  embedding: 0.5,
  keyword: 0.25,
  category: 0.15,
  usage: 0.1,
};
