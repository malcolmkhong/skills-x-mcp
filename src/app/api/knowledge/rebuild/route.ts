// API: Rebuild embeddings for all documents
import { NextResponse } from 'next/server';
import { rebuildAllEmbeddings } from '@/lib/knowledge/ingestion';

export async function POST() {
  try {
    const count = await rebuildAllEmbeddings();
    return NextResponse.json({ message: `Rebuilt embeddings for ${count} documents`, count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
