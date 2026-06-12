// IndustryX Knowledge MCP Server - Vector Search Service
// Implements hybrid retrieval with cosine similarity, keyword matching, category matching, and usage weighting
// Production: Replace with Supabase pgvector RPC for native vector search

import { db } from '@/lib/db';
import { cosineSimilarity } from './embedding';
import { DEFAULT_RETRIEVAL_WEIGHTS, type KnowledgeCategory, type HybridSearchResult, type RetrievalWeights, type VectorSearchResult } from '@/types/knowledge';

// Fields needed for search scoring (exclude markdownContent to reduce memory)
const SEARCH_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  description: true,
  keywords: true,
  embedding: true,
  accessCount: true,
} as const;

/**
 * Perform vector similarity search against all knowledge documents
 */
export async function vectorSearch(
  queryEmbedding: number[],
  limit: number = 5,
  category?: KnowledgeCategory,
  minScore: number = 0.1
): Promise<VectorSearchResult[]> {
  const where = {
    isActive: true,
    ...(category ? { category } : {}),
  };

  const documents = await db.knowledge.findMany({ where, select: SEARCH_SELECT });

  const scored: VectorSearchResult[] = documents
    .map(doc => {
      let embedding: number[];
      try {
        embedding = JSON.parse(doc.embedding);
      } catch {
        embedding = [];
      }

      const score = cosineSimilarity(queryEmbedding, embedding);
      return {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        category: doc.category as KnowledgeCategory,
        description: doc.description,
        score,
      };
    })
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * Keyword matching score - checks how many query terms match keywords/description/title
 */
function keywordMatchScore(query: string, keywords: string[], title: string, description: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (queryTerms.length === 0) return 0;

  const searchable = [
    ...keywords.map(k => k.toLowerCase()),
    ...title.toLowerCase().split(/\s+/),
    ...description.toLowerCase().split(/\s+/),
  ];

  let matchCount = 0;
  for (const term of queryTerms) {
    if (searchable.some(s => s.includes(term) || term.includes(s))) {
      matchCount++;
    }
  }

  return matchCount / queryTerms.length;
}

/**
 * Category match score - boost if query mentions the category
 */
function categoryMatchScore(query: string, category: KnowledgeCategory): number {
  const queryLower = query.toLowerCase();
  const categoryTerms: Record<string, string[]> = {
    'skills': ['skill', 'ability', 'capability', 'technique'],
    'sops': ['sop', 'procedure', 'process', 'standard operating', 'workflow'],
    'architecture': ['architecture', 'design', 'system design', 'structure', 'pattern'],
    'security': ['security', 'auth', 'vulnerability', 'threat', 'encrypt', 'protect'],
    'economy': ['economy', 'economic', 'currency', 'virtual economy'],
    'deployment': ['deploy', 'release', 'ci/cd', 'pipeline', 'infrastructure'],
    'ui-standards': ['ui', 'ux', 'design system', 'component', 'interface'],
    'backend-standards': ['backend', 'api', 'server', 'endpoint'],
    'frontend-standards': ['frontend', 'client', 'react', 'web'],
    'game-economy': ['game economy', 'balance', 'currency', 'reward'],
    'trading': ['trade', 'market', 'exchange', 'buy', 'sell'],
    'marketplace': ['marketplace', 'store', 'shop', 'listing'],
    'anti-cheat': ['cheat', 'hack', 'exploit', 'fair play', 'integrity'],
    'analytics': ['analytics', 'metric', 'data', 'report', 'tracking'],
    'liveops': ['liveops', 'live ops', 'event', 'remote config', 'ab test'],
    'premium': ['premium', 'vip', 'subscription', 'elite'],
    'monetization': ['monetiz', 'revenue', 'iap', 'purchase', 'pay'],
    'cloud-save': ['cloud save', 'save game', 'sync', 'backup'],
    'offline-sync': ['offline', 'sync', 'conflict', 'reconcil'],
  };

  const terms = categoryTerms[category] || [category];
  return terms.some(t => queryLower.includes(t)) ? 1.0 : 0.0;
}

/**
 * Usage weight - normalize access count to 0-1 range
 */
function usageWeight(accessCount: number): number {
  // Sigmoid-like normalization: more accessed = higher weight, but diminishing returns
  return 1 - Math.exp(-accessCount / 50);
}

/**
 * Hybrid retrieval - combines embedding similarity, keyword match, category match, and usage weight
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  limit: number = 5,
  category?: KnowledgeCategory,
  weights: RetrievalWeights = DEFAULT_RETRIEVAL_WEIGHTS,
  minScore: number = 0.1
): Promise<HybridSearchResult[]> {
  const where = {
    isActive: true,
    ...(category ? { category } : {}),
  };

  const documents = await db.knowledge.findMany({ where, select: SEARCH_SELECT });

  const scored: HybridSearchResult[] = documents
    .map(doc => {
      let embedding: number[];
      let keywords: string[];
      try {
        embedding = JSON.parse(doc.embedding);
      } catch {
        embedding = [];
      }
      try {
        keywords = JSON.parse(doc.keywords);
      } catch {
        keywords = [];
      }

      const embScore = cosineSimilarity(queryEmbedding, embedding);
      const kwScore = keywordMatchScore(query, keywords, doc.title, doc.description);
      const catScore = categoryMatchScore(query, doc.category as KnowledgeCategory);
      const useWeight = usageWeight(doc.accessCount);

      // Weighted combination
      const totalScore =
        weights.embedding * embScore +
        weights.keyword * kwScore +
        weights.category * catScore +
        weights.usage * useWeight;

      return {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        category: doc.category as KnowledgeCategory,
        description: doc.description,
        score: totalScore,
        embeddingScore: embScore,
        keywordScore: kwScore,
        categoryScore: catScore,
        usageWeight: useWeight,
      };
    })
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * Record a retrieval event for analytics
 */
export async function recordRetrieval(knowledgeId: string, query: string, score: number): Promise<void> {
  try {
    await db.retrievalStat.create({
      data: {
        knowledgeId,
        query,
        score,
      },
    });

    // Increment access count - use executeRaw to avoid returning full document with embedding
    await db.$executeRaw`UPDATE Knowledge SET accessCount = accessCount + 1, updatedAt = datetime('now') WHERE id = ${knowledgeId}`;
  } catch {
    // Don't fail the search if recording fails
  }
}
