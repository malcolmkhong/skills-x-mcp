// IndustryX MCP Server - API Client
// HTTP client for communicating with the main app's REST API
// AI-Native: Returns structured JSON knowledge units, not markdown blobs

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT_MS = 30000; // 30 second timeout for API calls

// Types matching the main app's API responses (JSON-native)
export interface KnowledgeDocumentSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  intents: string[];
  dependencies: string[];
  antiPatterns: string[];
  implementationSteps: string[];
  rules: string[];
  examples: Array<{ name: string; description: string }>;
  references: string[];
  version: number;
  schemaVersion: string;
  accessCount: number;
  relevanceScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  intents: string[];
  score: number;
  embeddingScore: number;
  keywordScore: number;
  categoryScore: number;
  intentScore: number;
  usageWeight: number;
}

export interface ContextBuildResponse {
  context: string;
  documentsUsed: number;
  totalTokens: number;
  sources: Array<{
    slug: string;
    title: string;
    category: string;
    score: number;
  }>;
}

// Helper for making HTTP requests with timeout
async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * List knowledge documents, optionally filtered by category
 */
export async function listDocuments(category?: string): Promise<{ documents: KnowledgeDocumentSummary[] }> {
  const params = new URLSearchParams();
  if (category) {
    params.set('category', category);
  }
  const query = params.toString();
  const path = `/api/knowledge${query ? `?${query}` : ''}`;
  return request<{ documents: KnowledgeDocumentSummary[] }>('GET', path);
}

/**
 * Search knowledge documents using hybrid retrieval
 */
export async function searchKnowledge(
  query: string,
  limit?: number,
  category?: string,
  minScore?: number
): Promise<{ results: SearchResult[] }> {
  const body: Record<string, unknown> = { query };
  if (limit !== undefined) body.limit = limit;
  if (category !== undefined) body.category = category;
  if (minScore !== undefined) body.minScore = minScore;

  return request<{ results: SearchResult[] }>('POST', '/api/knowledge/search', body);
}

/**
 * Get a single knowledge document by slug or ID
 */
export async function getDocument(slugOrId: string): Promise<{ document: KnowledgeDocumentSummary }> {
  return request<{ document: KnowledgeDocumentSummary }>('GET', `/api/knowledge/${encodeURIComponent(slugOrId)}`);
}

/**
 * Build context for AI agents from knowledge base
 */
export async function buildContext(
  query: string,
  maxDocuments?: number,
  maxTokenBudget?: number,
  category?: string
): Promise<ContextBuildResponse> {
  const body: Record<string, unknown> = { query };
  if (maxDocuments !== undefined) body.maxDocuments = maxDocuments;
  if (maxTokenBudget !== undefined) body.maxTokenBudget = maxTokenBudget;
  if (category !== undefined) body.category = category;

  return request<ContextBuildResponse>('POST', '/api/knowledge/context', body);
}

/**
 * Health check - verify connectivity to the main app API
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE_URL}/api/knowledge/stats`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
