// API: Ingest knowledge from JSON files
// Requires authentication. Validates paths to prevent directory traversal.
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { ingestKnowledgeBase, ingestCategory } from '@/lib/knowledge/ingestion';
import { requireAuth } from '@/lib/auth-utils';
import { validate, ingestSchema, isValidKnowledgeCategory } from '@/lib/api-validation';
import { handleApiError, apiError, safeParseBody } from '@/lib/api-error';

// Allowed root directory for knowledge files
const KNOWLEDGE_ROOT = path.resolve('/home/z/my-project/knowledge');

/**
 * Validate that a path is within the allowed knowledge directory.
 * Prevents path traversal attacks (e.g. ../../etc/passwd).
 */
function isPathSafe(inputPath: string): boolean {
  // Reject paths containing path traversal sequences
  if (inputPath.includes('..')) return false;

  // Resolve to an absolute path and verify it's within the knowledge root
  const resolved = path.resolve(inputPath);
  return resolved.startsWith(KNOWLEDGE_ROOT + path.sep) || resolved === KNOWLEDGE_ROOT;
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication — ingestion is a privileged operation
    await requireAuth();

    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const result = validate(ingestSchema, body);

    if (result.error) {
      return apiError(result.error, 400);
    }

    const { category, knowledgeBasePath } = result.data;

    // Validate the knowledge base path to prevent directory traversal
    if (!isPathSafe(knowledgeBasePath)) {
      return apiError(
        'Invalid knowledgeBasePath: path must be within the allowed knowledge directory',
        400
      );
    }

    // Validate category is a known category
    if (!isValidKnowledgeCategory(category)) {
      return apiError(
        `Invalid category. Must be one of the known knowledge categories.`,
        400
      );
    }

    const ingestResult = await ingestCategory(category as any, knowledgeBasePath);
    return NextResponse.json(ingestResult);
  } catch (error) {
    return handleApiError(error, 'knowledge/ingest');
  }
}
