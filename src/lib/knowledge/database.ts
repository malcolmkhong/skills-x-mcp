// IndustryX Knowledge MCP Server - Database Service
// AI-Native: CRUD operations for JSON knowledge units
// Workspace-aware: Supports workspace filtering and ownership

import { db } from '@/lib/db';
import { generateEmbedding, buildEmbeddingText } from './embedding';
import type { KnowledgeCategory, KnowledgeCreateInput, KnowledgeUpdateInput, KnowledgeStats, KnowledgeExample } from '@/types/knowledge';

/**
 * Create a new knowledge document with auto-generated embedding
 * Supports workspaceId and createdBy for ownership tracking
 */
export async function createKnowledge(input: KnowledgeCreateInput & { workspaceId?: string; createdBy?: string; isPublic?: boolean }) {
  try {
    // Build embedding text from structured fields
    const embeddingText = buildEmbeddingText({
      title: input.title,
      description: input.description || '',
      tags: input.tags,
      intents: input.intents,
      rules: [],
      antiPatterns: input.antiPatterns,
      implementationSteps: input.implementationSteps,
    });

    const embedding = generateEmbedding(embeddingText);

    return await db.knowledge.create({
      data: {
        slug: input.slug,
        title: input.title,
        category: input.category,
        description: input.description || '',
        tags: JSON.stringify(input.tags || []),
        intents: JSON.stringify(input.intents || []),
        dependencies: JSON.stringify(input.dependencies || []),
        antiPatterns: JSON.stringify(input.antiPatterns || []),
        implementationSteps: JSON.stringify(input.implementationSteps || []),
        rules: JSON.stringify(input.rules || []),
        examples: JSON.stringify(input.examples || []),
        references: JSON.stringify(input.references || []),
        embedding: JSON.stringify(embedding),
        schemaVersion: input.schemaVersion || '1.0.0',
        version: 1,
        workspaceId: input.workspaceId || null,
        createdBy: input.createdBy || null,
        isPublic: input.isPublic !== undefined ? input.isPublic : true,
      },
    });
  } catch (error) {
    console.error('[createKnowledge]', error)
    throw new Error(`Failed to createKnowledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a knowledge document by slug
 */
export async function getKnowledgeBySlug(slug: string) {
  try {
    return await db.knowledge.findUnique({
      where: { slug },
    });
  } catch (error) {
    console.error('[getKnowledgeBySlug]', error)
    throw new Error(`Failed to getKnowledgeBySlug: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a knowledge document by ID
 */
export async function getKnowledgeById(id: string) {
  try {
    return await db.knowledge.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error('[getKnowledgeById]', error)
    throw new Error(`Failed to getKnowledgeById: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List all knowledge documents with optional category and workspace filters
 * Excludes embedding to reduce payload
 * Backward compatible: no workspaceId = public knowledge only (isPublic=true or no workspace)
 */
export async function listKnowledge(
  category?: KnowledgeCategory,
  includeInactive: boolean = false,
  workspaceId?: string
) {
  try {
    // Build where clause based on filters
    const where: Record<string, unknown> = {
      ...(category ? { category } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    };

    if (workspaceId) {
      // When a specific workspace is requested, show that workspace's knowledge + public knowledge
      where.OR = [
        { workspaceId },
        { isPublic: true },
      ];
    } else {
      // No workspace filter: show all public knowledge (backward compatible)
      // Also includes workspace-scoped knowledge that is public
      where.isPublic = true;
    }

    return await db.knowledge.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        description: true,
        tags: true,
        intents: true,
        dependencies: true,
        antiPatterns: true,
        implementationSteps: true,
        rules: true,
        examples: true,
        references: true,
        version: true,
        schemaVersion: true,
        accessCount: true,
        relevanceScore: true,
        isActive: true,
        isPublic: true,
        workspaceId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // Exclude embedding to reduce payload
      },
    });
  } catch (error) {
    console.error('[listKnowledge]', error)
    throw new Error(`Failed to listKnowledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all knowledge documents for a specific workspace
 * This includes both public and private knowledge within the workspace
 */
export async function getKnowledgeByWorkspace(workspaceId: string) {
  try {
    return await db.knowledge.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        description: true,
        tags: true,
        intents: true,
        dependencies: true,
        antiPatterns: true,
        implementationSteps: true,
        rules: true,
        examples: true,
        references: true,
        version: true,
        schemaVersion: true,
        accessCount: true,
        relevanceScore: true,
        isActive: true,
        isPublic: true,
        workspaceId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error('[getKnowledgeByWorkspace]', error)
    throw new Error(`Failed to getKnowledgeByWorkspace: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Update a knowledge document
 */
export async function updateKnowledge(id: string, input: KnowledgeUpdateInput & { isPublic?: boolean }) {
  try {
    // If content changed, regenerate embedding
    let embedding: number[] | undefined;
    if (input.title || input.description || input.tags || input.intents || input.rules || input.antiPatterns || input.implementationSteps) {
      const current = await db.knowledge.findUnique({ where: { id } });
      if (current) {
        const embeddingText = buildEmbeddingText({
          title: input.title || current.title,
          description: input.description !== undefined ? input.description : current.description,
          tags: input.tags || JSON.parse(current.tags),
          intents: input.intents || JSON.parse(current.intents),
          rules: input.rules || JSON.parse(current.rules),
          antiPatterns: input.antiPatterns || JSON.parse(current.antiPatterns),
          implementationSteps: input.implementationSteps || JSON.parse(current.implementationSteps),
        });
        embedding = generateEmbedding(embeddingText);
      }
    }

    return await db.knowledge.update({
      where: { id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.tags ? { tags: JSON.stringify(input.tags) } : {}),
        ...(input.intents ? { intents: JSON.stringify(input.intents) } : {}),
        ...(input.dependencies ? { dependencies: JSON.stringify(input.dependencies) } : {}),
        ...(input.antiPatterns ? { antiPatterns: JSON.stringify(input.antiPatterns) } : {}),
        ...(input.implementationSteps ? { implementationSteps: JSON.stringify(input.implementationSteps) } : {}),
        ...(input.rules ? { rules: JSON.stringify(input.rules) } : {}),
        ...(input.examples ? { examples: JSON.stringify(input.examples) } : {}),
        ...(input.references ? { references: JSON.stringify(input.references) } : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        ...(embedding ? { embedding: JSON.stringify(embedding) } : {}),
        version: { increment: 1 },
      },
    });
  } catch (error) {
    console.error('[updateKnowledge]', error)
    throw new Error(`Failed to updateKnowledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a knowledge document (soft delete)
 */
export async function deleteKnowledge(id: string) {
  try {
    return await db.knowledge.update({
      where: { id },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('[deleteKnowledge]', error)
    throw new Error(`Failed to deleteKnowledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Hard delete a knowledge document
 */
export async function hardDeleteKnowledge(id: string) {
  try {
    await db.retrievalStat.deleteMany({ where: { knowledgeId: id } });
    return await db.knowledge.delete({ where: { id } });
  } catch (error) {
    console.error('[hardDeleteKnowledge]', error)
    throw new Error(`Failed to hardDeleteKnowledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Rebuild embedding for a specific document
 */
export async function rebuildEmbedding(id: string) {
  try {
    const doc = await db.knowledge.findUnique({ where: { id } });
    if (!doc) throw new Error('Document not found');

    let tags: string[] = [];
    let intents: string[] = [];
    let rules: string[] = [];
    let antiPatterns: string[] = [];
    let implementationSteps: string[] = [];
    
    try { tags = JSON.parse(doc.tags); } catch { /* empty */ }
    try { intents = JSON.parse(doc.intents); } catch { /* empty */ }
    try { rules = JSON.parse(doc.rules); } catch { /* empty */ }
    try { antiPatterns = JSON.parse(doc.antiPatterns); } catch { /* empty */ }
    try { implementationSteps = JSON.parse(doc.implementationSteps); } catch { /* empty */ }

    const embeddingText = buildEmbeddingText({
      title: doc.title,
      description: doc.description,
      tags,
      intents,
      rules,
      antiPatterns,
      implementationSteps,
    });

    const embedding = generateEmbedding(embeddingText);

    return await db.knowledge.update({
      where: { id },
      data: { embedding: JSON.stringify(embedding) },
    });
  } catch (error) {
    console.error('[rebuildEmbedding]', error)
    throw new Error(`Failed to rebuildEmbedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get knowledge statistics
 * Optionally scoped to a workspace
 */
export async function getKnowledgeStats(workspaceId?: string): Promise<KnowledgeStats> {
  try {
    const knowledgeWhere: Record<string, unknown> = { isActive: true };
    if (workspaceId) {
      knowledgeWhere.OR = [
        { workspaceId },
        { isPublic: true },
      ];
      delete knowledgeWhere.workspaceId;
    }

    const [totalDocuments, documents, topAccessed, recentIngestions, totalRetrievals] = await Promise.all([
      db.knowledge.count({ where: knowledgeWhere }),
      db.knowledge.findMany({
        where: knowledgeWhere,
        select: { category: true },
      }),
      db.knowledge.findMany({
        where: knowledgeWhere,
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
  } catch (error) {
    console.error('[getKnowledgeStats]', error)
    throw new Error(`Failed to getKnowledgeStats: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get similar documents based on a reference document
 */
export async function getSimilarDocuments(id: string, limit: number = 5) {
  try {
    const doc = await db.knowledge.findUnique({ where: { id } });
    if (!doc) throw new Error('Document not found');

    let embedding: number[];
    try {
      embedding = JSON.parse(doc.embedding);
    } catch {
      embedding = [];
    }

    // Build a search query from the document's intents and tags
    let intents: string[] = [];
    let tags: string[] = [];
    try { intents = JSON.parse(doc.intents); } catch { /* empty */ }
    try { tags = JSON.parse(doc.tags); } catch { /* empty */ }
    const searchQuery = [doc.title, doc.description, ...intents.slice(0, 3), ...tags.slice(0, 3)].join(' ');

    const { hybridSearch } = await import('./vectorSearch');
    return hybridSearch(searchQuery, embedding, limit + 1) // +1 to exclude self
      .then(results => results.filter(r => r.id !== id).slice(0, limit));
  } catch (error) {
    console.error('[getSimilarDocuments]', error)
    throw new Error(`Failed to getSimilarDocuments: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse a knowledge document's JSON fields for API responses
 */
export function parseDocumentFields(doc: Record<string, unknown>) {
  const parseJson = (field: unknown, fallback: unknown[] = []) => {
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch { return fallback; }
    }
    return Array.isArray(field) ? field : fallback;
  };

  return {
    ...doc,
    tags: parseJson(doc.tags),
    intents: parseJson(doc.intents),
    dependencies: parseJson(doc.dependencies),
    antiPatterns: parseJson(doc.antiPatterns),
    implementationSteps: parseJson(doc.implementationSteps),
    rules: parseJson(doc.rules),
    examples: parseJson(doc.examples, []),
    references: parseJson(doc.references),
    embedding: undefined, // Never return embedding
  };
}
