// IndustryX Knowledge MCP Server - Ingestion Pipeline
// AI-Native: Scans JSON knowledge unit files, validates schema, generates embeddings, stores content
// Supports auto-detection of skill formats (design-systems, etc.) via skill-adapter
// No markdown dependency - JSON is the primary source of truth

import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { generateEmbedding, buildEmbeddingText } from './embedding';
import { validateKnowledgeUnit } from '@/types/knowledge';
import { isSkillFormat, isCommandFormat, shouldSkipFile, transformSkillToKnowledgeUnit } from './skill-adapter';
import type { IngestionResult, KnowledgeCategory, JsonKnowledgeFile } from '@/types/knowledge';

/**
 * Parse a JSON knowledge unit file and validate against schema.
 * If the file is in skill/command format, auto-transform it.
 */
function parseJsonKnowledgeFile(
  filePath: string,
  knowledgeBase: string
): { data: JsonKnowledgeFile; rawContent?: string; errors?: string[]; format?: 'standard' | 'skill' | 'command' | 'skipped' } {
  const errors: string[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(content);
    
    // Check if this file should be skipped (plugin.json, overview.json, etc.)
    const filename = path.basename(filePath);
    if (shouldSkipFile(filename)) {
      return { data: {} as JsonKnowledgeFile, format: 'skipped' };
    }
    
    // Check if this is a skill or command format — auto-detect & transform
    if (isSkillFormat(raw) || isCommandFormat(raw)) {
      const format = isCommandFormat(raw) ? 'command' as const : 'skill' as const;
      const category = categoryFromPath(filePath, knowledgeBase);
      const relativePath = path.relative(knowledgeBase, filePath);
      
      const transformed = transformSkillToKnowledgeUnit(raw, {
        filename,
        relativePath,
        categoryFromPath: category,
      });
      
      // Convert to JsonKnowledgeFile format
      const knowledgeFile: JsonKnowledgeFile = {
        id: transformed.slug,
        title: transformed.title,
        category: transformed.category,
        description: transformed.description,
        tags: transformed.tags,
        intents: transformed.intents,
        dependencies: transformed.dependencies,
        anti_patterns: transformed.antiPatterns,
        implementation_steps: transformed.implementationSteps,
        rules: transformed.rules,
        examples: transformed.examples,
        references: transformed.references,
        metadata: { version: '1.0.0', updated_at: new Date().toISOString().split('T')[0] },
      };
      
      return { data: knowledgeFile, rawContent: transformed.rawContent, format };
    }
    
    // Standard KnowledgeUnit format — validate against Zod schema
    const validation = validateKnowledgeUnit(raw);
    if (!validation.success) {
      const zodErrors = validation.errors?.errors.map(e => `${e.path.join('.')}: ${e.message}`) || [];
      return { data: raw as JsonKnowledgeFile, errors: zodErrors, format: 'standard' };
    }
    
    return { data: validation.data as JsonKnowledgeFile, format: 'standard' };
  } catch (error) {
    return { 
      data: {} as JsonKnowledgeFile, 
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

/**
 * Derive slug from filename
 */
function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.json$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Derive category from directory path
 */
function categoryFromPath(filePath: string, knowledgeBase: string): KnowledgeCategory | undefined {
  const relativePath = path.relative(knowledgeBase, filePath);
  const parts = relativePath.split(path.sep);
  
  // Check first-level directory
  const firstDir = parts[0];
  // For nested paths like design-systems/skills/design-token.json,
  // the category is the top-level directory
  const secondDir = parts.length > 2 ? parts[1] : undefined;
  
  const categoryMap: Record<string, KnowledgeCategory> = {
    'skills': 'skills',
    'design-systems': 'design-systems',
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

  // Try first directory first
  if (categoryMap[firstDir]) return categoryMap[firstDir];
  
  return undefined;
}

/**
 * Scan a directory for JSON knowledge files recursively.
 * Skips known non-knowledge files (plugin.json, overview.json, etc.)
 */
function scanDirectory(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath));
    } else if (entry.name.endsWith('.json') && !shouldSkipFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Ingest a single JSON knowledge file.
 * Auto-detects format and transforms skill/command JSON as needed.
 */
async function ingestFile(
  filePath: string,
  knowledgeBase: string
): Promise<{ created: boolean; updated: boolean; error?: string; format?: string }> {
  try {
    const { data, rawContent, errors: parseErrors, format } = parseJsonKnowledgeFile(filePath, knowledgeBase);
    
    // Skipped files (plugin.json, overview.json)
    if (format === 'skipped') {
      return { created: false, updated: false, format: 'skipped' };
    }
    
    if (parseErrors && parseErrors.length > 0) {
      return { created: false, updated: false, error: `Schema validation failed: ${parseErrors.join('; ')}`, format };
    }

    // Use id from JSON, or derive from filename
    const slug = data.id || slugFromFilename(path.basename(filePath));
    const category = (data.category as KnowledgeCategory) || categoryFromPath(filePath, knowledgeBase);

    if (!category) {
      return { created: false, updated: false, error: `Cannot determine category for ${filePath}`, format };
    }

    const title = data.title || slug.replace(/-/g, ' ');
    const description = data.description || '';
    const tags = data.tags || [];
    const intents = data.intents || [];
    const dependencies = data.dependencies || [];
    const antiPatterns = data.anti_patterns || [];
    const implementationSteps = data.implementation_steps || [];
    const rules = data.rules || [];
    const examples = data.examples || [];
    const references = data.references || [];
    const schemaVersion = data.metadata?.version || '1.0.0';

    // Check if document exists
    const existing = await db.knowledge.findUnique({ where: { slug } });

    // Generate embedding from structured content
    const embeddingText = buildEmbeddingText({
      title,
      description,
      tags,
      intents,
      rules,
      antiPatterns,
      implementationSteps,
    });
    const embedding = generateEmbedding(embeddingText);

    if (existing) {
      // Check if content changed
      const existingData = {
        title: existing.title,
        description: existing.description,
        tags: existing.tags,
        rules: existing.rules,
        implementationSteps: existing.implementationSteps,
        antiPatterns: existing.antiPatterns,
      };
      
      const newData = {
        title,
        description,
        tags: JSON.stringify(tags),
        rules: JSON.stringify(rules),
        implementationSteps: JSON.stringify(implementationSteps),
        antiPatterns: JSON.stringify(antiPatterns),
      };
      
      const contentChanged = 
        existingData.title !== newData.title ||
        existingData.description !== newData.description ||
        existingData.tags !== newData.tags ||
        existingData.rules !== newData.rules ||
        existingData.implementationSteps !== newData.implementationSteps ||
        existingData.antiPatterns !== newData.antiPatterns;

      if (contentChanged) {
        await db.knowledge.update({
          where: { slug },
          data: {
            title,
            category,
            description,
            tags: JSON.stringify(tags),
            intents: JSON.stringify(intents),
            dependencies: JSON.stringify(dependencies),
            antiPatterns: JSON.stringify(antiPatterns),
            implementationSteps: JSON.stringify(implementationSteps),
            rules: JSON.stringify(rules),
            examples: JSON.stringify(examples),
            references: JSON.stringify(references),
            rawContent: rawContent || null,
            embedding: JSON.stringify(embedding),
            schemaVersion,
            version: { increment: 1 },
            isActive: true,
          },
        });
        return { created: false, updated: true, format };
      }

      return { created: false, updated: false, format }; // No changes
    }

    // Create new
    await db.knowledge.create({
      data: {
        slug,
        title,
        category,
        description,
        tags: JSON.stringify(tags),
        intents: JSON.stringify(intents),
        dependencies: JSON.stringify(dependencies),
        antiPatterns: JSON.stringify(antiPatterns),
        implementationSteps: JSON.stringify(implementationSteps),
        rules: JSON.stringify(rules),
        examples: JSON.stringify(examples),
        references: JSON.stringify(references),
        rawContent: rawContent || null,
        embedding: JSON.stringify(embedding),
        schemaVersion,
        version: 1,
      },
    });

    return { created: true, updated: false, format };
  } catch (error) {
    return { created: false, updated: false, error: String(error) };
  }
}

/**
 * Full ingestion pipeline - scan and index all JSON knowledge files.
 * Auto-detects skill formats and transforms them for storage.
 */
export async function ingestKnowledgeBase(knowledgeBasePath?: string): Promise<IngestionResult & { formatBreakdown?: Record<string, number> }> {
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
    const formatBreakdown: Record<string, number> = {};

    for (const file of files) {
      const result = await ingestFile(file, knowledgeBase);
      
      // Track format breakdown
      if (result.format) {
        formatBreakdown[result.format] = (formatBreakdown[result.format] || 0) + 1;
      }
      
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
      formatBreakdown,
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
 * Rebuild all embeddings using structured content
 */
export async function rebuildAllEmbeddings(): Promise<number> {
  const documents = await db.knowledge.findMany({ where: { isActive: true } });
  let count = 0;

  for (const doc of documents) {
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

    await db.knowledge.update({
      where: { id: doc.id },
      data: { embedding: JSON.stringify(embedding) },
    });

    count++;
  }

  return count;
}
