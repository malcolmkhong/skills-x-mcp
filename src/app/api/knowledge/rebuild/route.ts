// API: Rebuild embeddings for all documents
// Requires authentication (admin-level operation).
import { NextResponse } from 'next/server';
import { rebuildAllEmbeddings } from '@/lib/knowledge/ingestion';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';

export async function POST() {
  try {
    // Require authentication — rebuilding embeddings is a privileged operation
    await requireAuth();

    const count = await rebuildAllEmbeddings();
    return NextResponse.json({ message: `Rebuilt embeddings for ${count} documents`, count });
  } catch (error) {
    return handleApiError(error, 'knowledge/rebuild');
  }
}
