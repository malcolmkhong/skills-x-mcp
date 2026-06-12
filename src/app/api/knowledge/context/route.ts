// API: Build context for AI agent from structured JSON knowledge units
import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/knowledge/contextBuilder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, maxDocuments = 5, maxTokenBudget = 5000, category, sections } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    
    const result = await buildContext({
      query,
      maxDocuments,
      maxTokenBudget,
      category,
      sections,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
