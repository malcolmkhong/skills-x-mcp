// API: List all knowledge documents / Create new knowledge document
import { NextRequest, NextResponse } from 'next/server';
import { listKnowledge, createKnowledge } from '@/lib/knowledge/database';
import type { KnowledgeCategory } from '@/types/knowledge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as KnowledgeCategory | null;
    
    const documents = await listKnowledge(category || undefined);
    
    // Return without embedding data to reduce response size
    const sanitized = documents.map(doc => ({
      ...doc,
      embedding: undefined,
      keywords: JSON.parse(doc.keywords),
    }));
    
    return NextResponse.json({ documents: sanitized });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, title, category, description, keywords, markdownContent } = body;
    
    if (!slug || !title || !category || !markdownContent) {
      return NextResponse.json(
        { error: 'slug, title, category, and markdownContent are required' },
        { status: 400 }
      );
    }
    
    const document = await createKnowledge({
      slug,
      title,
      category,
      description,
      keywords,
      markdownContent,
    });
    
    return NextResponse.json({ 
      document: {
        ...document,
        embedding: undefined,
        keywords: JSON.parse(document.keywords),
      }
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A document with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
