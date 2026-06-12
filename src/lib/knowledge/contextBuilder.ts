// IndustryX Knowledge MCP Server - Context Builder Service
// Assembles relevant context from knowledge documents within token budgets

import { hybridSearch, recordRetrieval } from './vectorSearch';
import { generateEmbedding } from './embedding';
import type { ContextBuildRequest, ContextBuildResponse, KnowledgeCategory } from '@/types/knowledge';

// Rough token estimation: ~4 characters per token for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build context for an AI agent by retrieving only the most relevant knowledge
 * 
 * Flow:
 * 1. Generate embedding for user query
 * 2. Perform hybrid search
 * 3. Retrieve top results
 * 4. Apply token budget
 * 5. Merge context
 * 6. Return to agent
 */
export async function buildContext(request: ContextBuildRequest): Promise<ContextBuildResponse> {
  const {
    query,
    maxDocuments = 5,
    maxTokenBudget = 5000, // ~20KB context
    category,
  } = request;

  // Step 1: Generate embedding for the query
  const queryEmbedding = generateEmbedding(query);

  // Step 2: Perform hybrid search - retrieve more than needed for filtering
  const searchResults = await hybridSearch(
    query,
    queryEmbedding,
    maxDocuments * 2, // Retrieve extra for token budget filtering
    category
  );

  // Step 3: Record retrieval events
  for (const result of searchResults.slice(0, maxDocuments)) {
    await recordRetrieval(result.id, query, result.score).catch(() => {
      // Don't fail context building if recording fails
    });
  }

  // Step 4: Build context within token budget
  const sources: ContextBuildResponse['sources'] = [];
  const contextParts: string[] = [];
  let totalTokens = 0;
  let documentsUsed = 0;

  // Import db here to avoid circular dependencies
  const { db } = await import('@/lib/db');

  for (const result of searchResults) {
    if (documentsUsed >= maxDocuments) break;

    // Fetch document content only (exclude embedding to reduce memory)
    const doc = await db.knowledge.findUnique({
      where: { id: result.id },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        markdownContent: true,
        isActive: true,
      },
    });

    if (!doc || !doc.isActive) continue;

    const docContent = formatDocumentForContext(doc.slug, doc.title, doc.category, doc.markdownContent);
    const docTokens = estimateTokens(docContent);

    // Check if adding this document would exceed budget
    if (totalTokens + docTokens > maxTokenBudget) {
      // Try smart truncation
      const remainingTokens = maxTokenBudget - totalTokens;
      if (remainingTokens > 200) {
        // At least 200 tokens worth of content
        const truncatedContent = smartTruncate(doc.markdownContent, remainingTokens - 50); // 50 tokens for header
        const truncatedDoc = formatDocumentForContext(doc.slug, doc.title, doc.category, truncatedContent);
        contextParts.push(truncatedDoc);
        totalTokens += estimateTokens(truncatedDoc);
        sources.push({
          slug: doc.slug,
          title: doc.title,
          category: doc.category as KnowledgeCategory,
          score: result.score,
        });
        documentsUsed++;
      }
      break; // Budget exhausted
    }

    contextParts.push(docContent);
    totalTokens += docTokens;
    sources.push({
      slug: doc.slug,
      title: doc.title,
      category: doc.category as KnowledgeCategory,
      score: result.score,
    });
    documentsUsed++;
  }

  // Step 5: Merge context with clear boundaries
  const context = contextParts.length > 0
    ? `# Retrieved Knowledge Context\n\n${contextParts.join('\n\n---\n\n')}\n\n---\n\nEnd of retrieved context. Use this knowledge to assist with the user's request.`
    : 'No relevant knowledge found for this query.';

  return {
    context,
    documentsUsed,
    totalTokens,
    sources,
  };
}

/**
 * Format a knowledge document for injection into AI context
 */
function formatDocumentForContext(slug: string, title: string, category: string, content: string): string {
  return `## ${title}\n**Category:** ${category} | **Slug:** ${slug}\n\n${content}`;
}

/**
 * Smart truncation - tries to truncate at section boundaries
 */
function smartTruncate(content: string, maxTokens: number): string {
  const maxChars = maxTokens * 4; // Rough token to char conversion
  
  if (content.length <= maxChars) return content;

  // Try to truncate at a section boundary (## heading)
  const truncated = content.substring(0, maxChars);
  const lastSectionBreak = truncated.lastIndexOf('\n## ');
  
  if (lastSectionBreak > maxChars * 0.5) {
    return truncated.substring(0, lastSectionBreak) + '\n\n*[Content truncated due to token budget]*';
  }

  // Try to truncate at paragraph boundary
  const lastParagraphBreak = truncated.lastIndexOf('\n\n');
  if (lastParagraphBreak > maxChars * 0.5) {
    return truncated.substring(0, lastParagraphBreak) + '\n\n*[Content truncated due to token budget]*';
  }

  // Hard truncate at sentence boundary
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );

  if (lastSentenceEnd > maxChars * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1) + ' *[Content truncated due to token budget]*';
  }

  return truncated + '... *[Content truncated due to token budget]*';
}
