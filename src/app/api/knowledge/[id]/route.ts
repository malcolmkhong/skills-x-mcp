// API: Get/Update/Delete individual knowledge document
import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeById, getKnowledgeBySlug, updateKnowledge, deleteKnowledge, hardDeleteKnowledge } from '@/lib/knowledge/database';

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
      document: {
        ...document,
        embedding: undefined,
        keywords: JSON.parse(document.keywords),
      }
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
    const { title, category, description, keywords, markdownContent } = body;
    
    const document = await updateKnowledge(id, {
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
