// IndustryX Knowledge MCP Server - Vector Search Service
// AI-Native: Hybrid retrieval with intent matching for JSON knowledge units
// Production: Replace with Supabase pgvector RPC for native vector search

import { db } from '@/lib/db';
import { cosineSimilarity } from './embedding';
import { DEFAULT_RETRIEVAL_WEIGHTS, type KnowledgeCategory, type HybridSearchResult, type RetrievalWeights, type VectorSearchResult } from '@/types/knowledge';

// Fields needed for search scoring (exclude large JSON arrays to reduce memory)
const SEARCH_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  description: true,
  tags: true,
  intents: true,
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
 * Keyword matching score - checks how many query terms match tags/intents/description/title
 */
function keywordMatchScore(
  query: string,
  tags: string[],
  title: string,
  description: string,
  intents: string[]
): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (queryTerms.length === 0) return 0;

  const searchable = [
    ...tags.map(k => k.toLowerCase()),
    ...intents.map(i => i.toLowerCase()),
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
 * Intent matching score - boost if query matches the knowledge unit's declared intents
 */
function intentMatchScore(query: string, intents: string[]): number {
  if (intents.length === 0) return 0;

  const queryLower = query.toLowerCase();
  let matchCount = 0;

  for (const intent of intents) {
    const intentLower = intent.toLowerCase();
    // Check if query contains the intent or vice versa
    if (queryLower.includes(intentLower) || intentLower.includes(queryLower)) {
      matchCount++;
      continue;
    }
    // Partial word matching within intent
    const intentWords = intentLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    const wordOverlap = intentWords.filter(iw =>
      queryWords.some(qw => qw.includes(iw) || iw.includes(qw))
    );
    if (wordOverlap.length > 0) {
      matchCount += wordOverlap.length / intentWords.length;
    }
  }

  return Math.min(matchCount / intents.length, 1.0);
}

/**
 * Category match score - boost if query mentions the category
 */
function categoryMatchScore(query: string, category: KnowledgeCategory): number {
  const queryLower = query.toLowerCase();
  const categoryTerms: Record<string, string[]> = {
    'skills': ['skill', 'ability', 'capability', 'technique', 'implement', 'build'],
    'sops': ['sop', 'procedure', 'process', 'standard operating', 'workflow', 'how to'],
    'architecture': ['architecture', 'design', 'system design', 'structure', 'pattern', 'microservice'],
    'security': ['security', 'auth', 'vulnerability', 'threat', 'encrypt', 'protect', 'cheat'],
    'economy': ['economy', 'economic', 'currency', 'virtual economy', 'balance', 'monetiz'],
    'deployment': ['deploy', 'release', 'ci/cd', 'pipeline', 'infrastructure', 'devops'],
    'ui-standards': ['ui', 'ux', 'design system', 'component', 'interface', 'dashboard'],
    'backend-standards': ['backend', 'api', 'server', 'endpoint'],
    'frontend-standards': ['frontend', 'client', 'react', 'web'],
    'game-economy': ['game economy', 'balance', 'currency', 'reward', 'faucet', 'sink'],
    'trading': ['trade', 'market', 'exchange', 'buy', 'sell', 'escrow'],
    'marketplace': ['marketplace', 'store', 'shop', 'listing'],
    'anti-cheat': ['cheat', 'hack', 'exploit', 'fair play', 'integrity', 'bot'],
    'analytics': ['analytics', 'metric', 'data', 'report', 'tracking'],
    'liveops': ['liveops', 'live ops', 'event', 'remote config', 'ab test'],
    'premium': ['premium', 'vip', 'subscription', 'elite'],
    'monetization': ['monetiz', 'revenue', 'iap', 'purchase', 'pay', 'battle pass'],
    'cloud-save': ['cloud save', 'save game', 'sync', 'backup', 'offline'],
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
 * Hybrid retrieval - combines embedding similarity, keyword match, intent match, category match, and usage weight
 * Score = Embedding (0.40) + Keyword (0.20) + Category (0.15) + Intent (0.15) + Usage (0.10)
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
      let tags: string[];
      let intents: string[];
      try {
        embedding = JSON.parse(doc.embedding);
      } catch {
        embedding = [];
      }
      try {
        tags = JSON.parse(doc.tags);
      } catch {
        tags = [];
      }
      try {
        intents = JSON.parse(doc.intents);
      } catch {
        intents = [];
      }

      const embScore = cosineSimilarity(queryEmbedding, embedding);
      const kwScore = keywordMatchScore(query, tags, doc.title, doc.description, intents);
      const catScore = categoryMatchScore(query, doc.category as KnowledgeCategory);
      const intScore = intentMatchScore(query, intents);
      const useWeight = usageWeight(doc.accessCount);

      // Weighted combination
      const totalScore =
        weights.embedding * embScore +
        weights.keyword * kwScore +
        weights.category * catScore +
        weights.intent * intScore +
        weights.usage * useWeight;

      return {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        category: doc.category as KnowledgeCategory,
        description: doc.description,
        tags,
        intents,
        score: totalScore,
        embeddingScore: embScore,
        keywordScore: kwScore,
        categoryScore: catScore,
        intentScore: intScore,
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
