// API: Get/Update/Delete individual knowledge document
import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeById, getKnowledgeBySlug, updateKnowledge, deleteKnowledge, hardDeleteKnowledge, parseDocumentFields } from '@/lib/knowledge/database';
import { validate, updateKnowledgeSchema } from '@/lib/api-validation';
import { handleApiError, apiError, safeParseBody } from '@/lib/api-error';

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
      return apiError('Document not found', 404);
    }
    
    return NextResponse.json({ 
      document: parseDocumentFields(document)
    });
  } catch (error) {
    return handleApiError(error, 'knowledge/[id]/GET');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await safeParseBody(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    const validation = validate(updateKnowledgeSchema, body);
    if (validation.error) {
      return apiError(validation.error, 400);
    }
    
    const document = await updateKnowledge(id, validation.data);
    
    return NextResponse.json({ 
      document: parseDocumentFields(document)
    });
  } catch (error) {
    return handleApiError(error, 'knowledge/[id]/PUT');
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
  } catch (error) {
    return handleApiError(error, 'knowledge/[id]/DELETE');
  }
}
