// API: Search knowledge using hybrid retrieval
import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/knowledge/embedding';
import { hybridSearch, recordRetrieval } from '@/lib/knowledge/vectorSearch';
import type { KnowledgeCategory } from '@/types/knowledge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 5, category, minScore = 0.1 } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Perform hybrid search
    const results = await hybridSearch(
      query,
      queryEmbedding,
      limit,
      category as KnowledgeCategory | undefined,
      undefined,
      minScore
    );
    
    // Record retrieval events
    for (const result of results) {
      await recordRetrieval(result.id, query, result.score).catch(() => {});
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
