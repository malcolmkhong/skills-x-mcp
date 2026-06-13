// API: Get knowledge statistics
import { NextResponse } from 'next/server';
import { getKnowledgeStats } from '@/lib/knowledge/database';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const stats = await getKnowledgeStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'knowledge/stats');
  }
}
