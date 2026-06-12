// IndustryX Knowledge MCP Server - Ingestion Pipeline
// Scans markdown files, reads metadata, generates embeddings, stores content

import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { generateEmbedding } from './embedding';
import type { IngestionResult, MarkdownMetadata, KnowledgeCategory, KNOWLEDGE_CATEGORIES } from '@/types/knowledge';

/**
 * Parse frontmatter metadata from markdown content
 * Format:
 * ---
 * title: Document Title
 * category: skills
 * description: Brief description
 * keywords: keyword1, keyword2, keyword3
 * ---
 */
function parseFrontmatter(content: string): { metadata: Partial<MarkdownMetadata>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      metadata: {},
      body: content,
    };
  }

  const frontmatter = match[1];
  const body = match[2];

  const metadata: Partial<MarkdownMetadata> = {};

  const lines = frontmatter.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    switch (key) {
      case 'slug':
        metadata.slug = value;
        break;
      case 'title':
        metadata.title = value;
        break;
      case 'category':
        metadata.category = value as KnowledgeCategory;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'keywords':
        metadata.keywords = value.split(',').map(k => k.trim()).filter(Boolean);
        break;
    }
  }

  return { metadata, body };
}

/**
 * Derive slug from filename
 */
function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/\.markdown$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Derive category from directory path
 */
function categoryFromPath(filePath: string, knowledgeBase: string): KnowledgeCategory | undefined {
  const relativePath = path.relative(knowledgeBase, filePath);
  const firstDir = relativePath.split(path.sep)[0];
  
  const categoryMap: Record<string, KnowledgeCategory> = {
    'skills': 'skills',
    'sops': 'sops',
    'architecture': 'architecture',
    'security': 'security',
    'economy': 'economy',
    'deployment': 'deployment',
    'ui-standards': 'ui-standards',
    'ui_standards': 'ui-standards',
    'backend-standards': 'backend-standards',
    'backend_standards': 'backend-standards',
    'frontend-standards': 'frontend-standards',
    'frontend_standards': 'frontend-standards',
    'game-economy': 'game-economy',
    'game_economy': 'game-economy',
    'trading': 'trading',
    'marketplace': 'marketplace',
    'anti-cheat': 'anti-cheat',
    'anti_cheat': 'anti-cheat',
    'analytics': 'analytics',
    'liveops': 'liveops',
    'premium': 'premium',
    'monetization': 'monetization',
    'cloud-save': 'cloud-save',
    'cloud_save': 'cloud-save',
    'offline-sync': 'offline-sync',
    'offline_sync': 'offline-sync',
  };

  return categoryMap[firstDir];
}

/**
 * Scan a directory for markdown files recursively
 */
function scanDirectory(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Ingest a single markdown file
 */
async function ingestFile(
  filePath: string,
  knowledgeBase: string
): Promise<{ created: boolean; updated: boolean; error?: string }> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseFrontmatter(content);

    const slug = metadata.slug || slugFromFilename(path.basename(filePath));
    const category = metadata.category || categoryFromPath(filePath, knowledgeBase);

    if (!category) {
      return { created: false, updated: false, error: `Cannot determine category for ${filePath}` };
    }

    const title = metadata.title || slugFromFilename(path.basename(filePath)).replace(/-/g, ' ');
    const description = metadata.description || '';
    const keywords = metadata.keywords || [];
    const markdownContent = body.trim();

    // Check if document exists
    const existing = await db.knowledge.findUnique({ where: { slug } });

    // Generate embedding
    const embeddingText = [title, description, ...keywords, markdownContent.substring(0, 1000)].join(' ');
    const embedding = generateEmbedding(embeddingText);

    if (existing) {
      // Update existing
      const contentChanged = existing.markdownContent !== markdownContent ||
        existing.title !== title ||
        existing.description !== description;

      if (contentChanged) {
        await db.knowledge.update({
          where: { slug },
          data: {
            title,
            category,
            description,
            keywords: JSON.stringify(keywords),
            markdownContent,
            embedding: JSON.stringify(embedding),
            version: { increment: 1 },
            isActive: true,
          },
        });
        return { created: false, updated: true };
      }

      return { created: false, updated: false }; // No changes
    }

    // Create new
    await db.knowledge.create({
      data: {
        slug,
        title,
        category,
        description,
        keywords: JSON.stringify(keywords),
        markdownContent,
        embedding: JSON.stringify(embedding),
        version: 1,
      },
    });

    return { created: true, updated: false };
  } catch (error) {
    return { created: false, updated: false, error: String(error) };
  }
}

/**
 * Full ingestion pipeline - scan and index all markdown files
 */
export async function ingestKnowledgeBase(knowledgeBasePath?: string): Promise<IngestionResult> {
  const knowledgeBase = knowledgeBasePath || path.join(process.cwd(), 'knowledge');
  
  const log = await db.ingestionLog.create({
    data: {
      operation: 'full_reindex',
      status: 'running',
    },
  });

  try {
    const files = scanDirectory(knowledgeBase);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: IngestionResult['errors'] = [];

    for (const file of files) {
      const result = await ingestFile(file, knowledgeBase);
      if (result.error) {
        errors.push({ file: path.relative(knowledgeBase, file), error: result.error });
      } else if (result.created) {
        created++;
      } else if (result.updated) {
        updated++;
      } else {
        skipped++;
      }
    }

    await db.ingestionLog.update({
      where: { id: log.id },
      data: {
        documentsProcessed: files.length,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    return {
      totalProcessed: files.length,
      created,
      updated,
      skipped,
      errors,
    };
  } catch (error) {
    await db.ingestionLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        errorMessage: String(error),
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Ingest a single category
 */
export async function ingestCategory(category: KnowledgeCategory, knowledgeBasePath?: string): Promise<IngestionResult> {
  const knowledgeBase = knowledgeBasePath || path.join(process.cwd(), 'knowledge');

  const log = await db.ingestionLog.create({
    data: {
      operation: 'category_reindex',
      category,
      status: 'running',
    },
  });

  try {
    const categoryDir = path.join(knowledgeBase, category);
    const files = scanDirectory(categoryDir);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: IngestionResult['errors'] = [];

    for (const file of files) {
      const result = await ingestFile(file, knowledgeBase);
      if (result.error) {
        errors.push({ file: path.relative(knowledgeBase, file), error: result.error });
      } else if (result.created) {
        created++;
      } else if (result.updated) {
        updated++;
      } else {
        skipped++;
      }
    }

    await db.ingestionLog.update({
      where: { id: log.id },
      data: {
        documentsProcessed: files.length,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    return {
      totalProcessed: files.length,
      created,
      updated,
      skipped,
      errors,
    };
  } catch (error) {
    await db.ingestionLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        errorMessage: String(error),
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Rebuild all embeddings
 */
export async function rebuildAllEmbeddings(): Promise<number> {
  const documents = await db.knowledge.findMany({ where: { isActive: true } });
  let count = 0;

  for (const doc of documents) {
    const embeddingText = [
      doc.title,
      doc.description,
      ...JSON.parse(doc.keywords),
      doc.markdownContent.substring(0, 1000),
    ].join(' ');

    const embedding = generateEmbedding(embeddingText);

    await db.knowledge.update({
      where: { id: doc.id },
      data: { embedding: JSON.stringify(embedding) },
    });

    count++;
  }

  return count;
}
