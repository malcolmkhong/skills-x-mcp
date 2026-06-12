// IndustryX Knowledge MCP Server - Context Builder Service
// AI-Native: Assembles structured JSON context from knowledge units within token budgets
// Returns structured sections (rules, steps, anti_patterns, dependencies, examples) instead of markdown blobs

import { hybridSearch, recordRetrieval } from './vectorSearch';
import { generateEmbedding } from './embedding';
import type { ContextBuildRequest, ContextBuildResponse, KnowledgeCategory, KnowledgeExample } from '@/types/knowledge';

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
 * 4. Select requested sections from each knowledge unit
 * 5. Apply token budget
 * 6. Format as structured context
 * 7. Return to agent
 */
export async function buildContext(request: ContextBuildRequest): Promise<ContextBuildResponse> {
  const {
    query,
    maxDocuments = 5,
    maxTokenBudget = 5000, // ~20KB context
    category,
    sections = ['rules', 'steps', 'anti_patterns', 'dependencies', 'examples'],
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
        description: true,
        tags: true,
        intents: true,
        dependencies: true,
        antiPatterns: true,
        implementationSteps: true,
        rules: true,
        examples: true,
        references: true,
        isActive: true,
      },
    });

    if (!doc || !doc.isActive) continue;

    // Parse JSON fields
    let tags: string[] = [];
    let intents: string[] = [];
    let dependencies: string[] = [];
    let antiPatterns: string[] = [];
    let implementationSteps: string[] = [];
    let rules: string[] = [];
    let examples: KnowledgeExample[] = [];
    let references: string[] = [];

    try { tags = JSON.parse(doc.tags); } catch { /* empty */ }
    try { intents = JSON.parse(doc.intents); } catch { /* empty */ }
    try { dependencies = JSON.parse(doc.dependencies); } catch { /* empty */ }
    try { antiPatterns = JSON.parse(doc.antiPatterns); } catch { /* empty */ }
    try { implementationSteps = JSON.parse(doc.implementationSteps); } catch { /* empty */ }
    try { rules = JSON.parse(doc.rules); } catch { /* empty */ }
    try { examples = JSON.parse(doc.examples); } catch { /* empty */ }
    try { references = JSON.parse(doc.references); } catch { /* empty */ }

    // Build structured context from requested sections
    const docContext = formatKnowledgeUnitForContext({
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      description: doc.description,
      tags,
      intents,
      dependencies,
      antiPatterns,
      implementationSteps,
      rules,
      examples,
      references,
      sections,
    });

    const docTokens = estimateTokens(docContext);

    // Check if adding this document would exceed budget
    if (totalTokens + docTokens > maxTokenBudget) {
      // Try smart truncation
      const remainingTokens = maxTokenBudget - totalTokens;
      if (remainingTokens > 200) {
        const truncatedContext = smartTruncate(docContext, remainingTokens);
        contextParts.push(truncatedContext);
        totalTokens += estimateTokens(truncatedContext);
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

    contextParts.push(docContext);
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
 * Format a knowledge unit for injection into AI context
 * Returns structured sections based on what was requested
 */
function formatKnowledgeUnitForContext(unit: {
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  intents: string[];
  dependencies: string[];
  antiPatterns: string[];
  implementationSteps: string[];
  rules: string[];
  examples: KnowledgeExample[];
  references: string[];
  sections: string[];
}): string {
  const parts: string[] = [];
  
  // Always include header and description
  parts.push(`## ${unit.title}`);
  parts.push(`**ID:** ${unit.slug} | **Category:** ${unit.category}`);
  parts.push(`**Description:** ${unit.description}`);
  
  if (unit.tags.length > 0) {
    parts.push(`**Tags:** ${unit.tags.join(', ')}`);
  }
  
  // Add requested sections
  if (unit.sections.includes('rules') && unit.rules.length > 0) {
    parts.push('\n### Rules');
    unit.rules.forEach((rule, i) => parts.push(`${i + 1}. ${rule}`));
  }
  
  if (unit.sections.includes('steps') && unit.implementationSteps.length > 0) {
    parts.push('\n### Implementation Steps');
    unit.implementationSteps.forEach((step, i) => parts.push(`${i + 1}. ${step}`));
  }
  
  if (unit.sections.includes('anti_patterns') && unit.antiPatterns.length > 0) {
    parts.push('\n### Anti-Patterns');
    unit.antiPatterns.forEach((ap, i) => parts.push(`⚠️ ${i + 1}. ${ap}`));
  }
  
  if (unit.sections.includes('dependencies') && unit.dependencies.length > 0) {
    parts.push('\n### Dependencies');
    unit.dependencies.forEach(dep => parts.push(`- ${dep}`));
  }
  
  if (unit.sections.includes('examples') && unit.examples.length > 0) {
    parts.push('\n### Examples');
    unit.examples.forEach(ex => parts.push(`- **${ex.name}**: ${ex.description}`));
  }
  
  // Always include intents and references if available
  if (unit.intents.length > 0) {
    parts.push(`\n**Matches intents:** ${unit.intents.join(', ')}`);
  }
  
  if (unit.references.length > 0) {
    parts.push(`**See also:** ${unit.references.join(', ')}`);
  }
  
  return parts.join('\n');
}

/**
 * Smart truncation - tries to truncate at section boundaries
 */
function smartTruncate(content: string, maxTokens: number): string {
  const maxChars = maxTokens * 4; // Rough token to char conversion
  
  if (content.length <= maxChars) return content;

  // Try to truncate at a section boundary (### heading)
  const truncated = content.substring(0, maxChars);
  const lastSectionBreak = truncated.lastIndexOf('\n### ');
  
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
