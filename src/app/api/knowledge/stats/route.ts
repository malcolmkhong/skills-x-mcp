// API: Get knowledge statistics
import { NextResponse } from 'next/server';
import { getKnowledgeStats } from '@/lib/knowledge/database';

export async function GET() {
  try {
    const stats = await getKnowledgeStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
