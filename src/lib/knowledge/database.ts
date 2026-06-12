// IndustryX Knowledge MCP Server - Database Service
// CRUD operations for knowledge documents

import { db } from '@/lib/db';
import { generateEmbedding } from './embedding';
import type { KnowledgeCategory, KnowledgeCreateInput, KnowledgeUpdateInput, KnowledgeStats } from '@/types/knowledge';

/**
 * Create a new knowledge document with auto-generated embedding
 */
export async function createKnowledge(input: KnowledgeCreateInput) {
  // Generate embedding from title + description + keywords + first part of content
  const embeddingText = [
    input.title,
    input.description || '',
    ...(input.keywords || []),
    input.markdownContent.substring(0, 1000),
  ].join(' ');

  const embedding = generateEmbedding(embeddingText);

  return db.knowledge.create({
    data: {
      slug: input.slug,
      title: input.title,
      category: input.category,
      description: input.description || '',
      keywords: JSON.stringify(input.keywords || []),
      markdownContent: input.markdownContent,
      embedding: JSON.stringify(embedding),
      version: 1,
    },
  });
}

/**
 * Get a knowledge document by slug
 */
export async function getKnowledgeBySlug(slug: string) {
  return db.knowledge.findUnique({
    where: { slug },
  });
}

/**
 * Get a knowledge document by ID
 */
export async function getKnowledgeById(id: string) {
  return db.knowledge.findUnique({
    where: { id },
  });
}

/**
 * List all knowledge documents with optional category filter
 */
export async function listKnowledge(category?: KnowledgeCategory, includeInactive: boolean = false) {
  return db.knowledge.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      description: true,
      keywords: true,
      markdownContent: true,
      version: true,
      accessCount: true,
      relevanceScore: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Exclude embedding to reduce payload
    },
  });
}

/**
 * Update a knowledge document
 */
export async function updateKnowledge(id: string, input: KnowledgeUpdateInput) {
  // If content changed, regenerate embedding
  let embedding: number[] | undefined;
  if (input.markdownContent || input.title || input.description || input.keywords) {
    const current = await db.knowledge.findUnique({ where: { id } });
    if (current) {
      const embeddingText = [
        input.title || current.title,
        input.description || current.description,
        ...(input.keywords || JSON.parse(current.keywords)),
        (input.markdownContent || current.markdownContent).substring(0, 1000),
      ].join(' ');
      embedding = generateEmbedding(embeddingText);
    }
  }

  return db.knowledge.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.keywords ? { keywords: JSON.stringify(input.keywords) } : {}),
      ...(input.markdownContent ? { markdownContent: input.markdownContent } : {}),
      ...(embedding ? { embedding: JSON.stringify(embedding) } : {}),
      version: { increment: 1 },
    },
  });
}

/**
 * Delete a knowledge document
 */
export async function deleteKnowledge(id: string) {
  // Soft delete by setting isActive to false
  return db.knowledge.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Hard delete a knowledge document
 */
export async function hardDeleteKnowledge(id: string) {
  await db.retrievalStat.deleteMany({ where: { knowledgeId: id } });
  return db.knowledge.delete({ where: { id } });
}

/**
 * Rebuild embedding for a specific document
 */
export async function rebuildEmbedding(id: string) {
  const doc = await db.knowledge.findUnique({ where: { id } });
  if (!doc) throw new Error('Document not found');

  const embeddingText = [
    doc.title,
    doc.description,
    ...JSON.parse(doc.keywords),
    doc.markdownContent.substring(0, 1000),
  ].join(' ');

  const embedding = generateEmbedding(embeddingText);

  return db.knowledge.update({
    where: { id },
    data: { embedding: JSON.stringify(embedding) },
  });
}

/**
 * Get knowledge statistics
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const [totalDocuments, documents, topAccessed, recentIngestions, totalRetrievals] = await Promise.all([
    db.knowledge.count({ where: { isActive: true } }),
    db.knowledge.findMany({
      where: { isActive: true },
      select: { category: true },
    }),
    db.knowledge.findMany({
      where: { isActive: true },
      orderBy: { accessCount: 'desc' },
      take: 10,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        accessCount: true,
      },
    }),
    db.ingestionLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    db.retrievalStat.count(),
  ]);

  const documentsByCategory: Record<string, number> = {};
  for (const doc of documents) {
    documentsByCategory[doc.category] = (documentsByCategory[doc.category] || 0) + 1;
  }

  return {
    totalDocuments,
    documentsByCategory,
    totalRetrievals,
    topAccessed: topAccessed.map(d => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      category: d.category,
      accessCount: d.accessCount,
    })),
    recentIngestions: recentIngestions.map(i => ({
      id: i.id,
      operation: i.operation,
      category: i.category,
      documentsProcessed: i.documentsProcessed,
      status: i.status,
      startedAt: i.startedAt.toISOString(),
      completedAt: i.completedAt?.toISOString() || null,
    })),
  };
}

/**
 * Get similar documents based on a reference document
 */
export async function getSimilarDocuments(id: string, limit: number = 5) {
  const doc = await db.knowledge.findUnique({ where: { id } });
  if (!doc) throw new Error('Document not found');

  let embedding: number[];
  try {
    embedding = JSON.parse(doc.embedding);
  } catch {
    embedding = [];
  }

  const { hybridSearch } = await import('./vectorSearch');
  return hybridSearch(doc.title + ' ' + doc.description, embedding, limit + 1) // +1 to exclude self
    .then(results => results.filter(r => r.id !== id).slice(0, limit));
}
