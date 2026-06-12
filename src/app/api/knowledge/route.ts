// API: List all knowledge documents / Create new knowledge document
import { NextRequest, NextResponse } from 'next/server';
import { listKnowledge, createKnowledge, parseDocumentFields } from '@/lib/knowledge/database';
import type { KnowledgeCategory } from '@/types/knowledge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as KnowledgeCategory | null;
    
    const documents = await listKnowledge(category || undefined);
    
    // Parse JSON fields and strip embedding data
    const sanitized = documents.map(doc => parseDocumentFields(doc));
    
    return NextResponse.json({ documents: sanitized });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, title, category, description, tags, intents, dependencies, antiPatterns, implementationSteps, rules, examples, references, schemaVersion } = body;
    
    if (!slug || !title || !category) {
      return NextResponse.json(
        { error: 'slug, title, and category are required' },
        { status: 400 }
      );
    }
    
    const document = await createKnowledge({
      slug,
      title,
      category,
      description,
      tags,
      intents,
      dependencies,
      antiPatterns,
      implementationSteps,
      rules,
      examples,
      references,
      schemaVersion,
    });
    
    return NextResponse.json({ 
      document: parseDocumentFields(document)
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A document with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
