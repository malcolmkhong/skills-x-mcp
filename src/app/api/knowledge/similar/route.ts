// API: Get similar documents
import { NextRequest, NextResponse } from 'next/server';
import { getSimilarDocuments } from '@/lib/knowledge/database';
import { validate, similarSchema } from '@/lib/api-validation';
import { handleApiError, apiError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const validation = validate(similarSchema, {
      id: searchParams.get('id'),
      limit: searchParams.get('limit'),
    });

    if (validation.error) {
      return apiError(validation.error, 400);
    }

    const { id, limit } = validation.data;
    
    const results = await getSimilarDocuments(id, limit);
    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error, 'knowledge/similar');
  }
}
