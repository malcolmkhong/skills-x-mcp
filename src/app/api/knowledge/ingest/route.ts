// API: Ingest knowledge from JSON files
import { NextRequest, NextResponse } from 'next/server';
import { ingestKnowledgeBase, ingestCategory } from '@/lib/knowledge/ingestion';
import type { KnowledgeCategory } from '@/types/knowledge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, knowledgeBasePath } = body;
    
    let result;
    if (category) {
      result = await ingestCategory(category as KnowledgeCategory, knowledgeBasePath);
    } else {
      result = await ingestKnowledgeBase(knowledgeBasePath);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
