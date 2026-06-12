// API: Get/Update/Delete individual knowledge document
import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeById, getKnowledgeBySlug, updateKnowledge, deleteKnowledge, hardDeleteKnowledge, parseDocumentFields } from '@/lib/knowledge/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Try ID first, then slug
    let document = await getKnowledgeById(id);
    if (!document) {
      document = await getKnowledgeBySlug(id);
    }
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      document: parseDocumentFields(document)
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, category, description, tags, intents, dependencies, antiPatterns, implementationSteps, rules, examples, references } = body;
    
    const document = await updateKnowledge(id, {
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
    });
    
    return NextResponse.json({ 
      document: parseDocumentFields(document)
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';
    
    if (hard) {
      await hardDeleteKnowledge(id);
    } else {
      await deleteKnowledge(id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
