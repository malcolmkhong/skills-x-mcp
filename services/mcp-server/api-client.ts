// IndustryX MCP Server - API Client
// HTTP client for communicating with the main app's REST API
// AI-Native: Returns structured JSON knowledge units, not markdown blobs
// Enhanced: API key auth headers, key validation, usage tracking

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT_MS = 30000; // 30 second timeout for API calls

// ─── Auth Context ──────────────────────────────────────────────────────────

export interface AuthContext {
  apiKey: string;
  userId: string;
  apiKeyId: string;
  permissions: string[];
  plan: string;
  workspaceId: string | null;
  rateLimit: number;
  monthlyLimit: number;
  monthlyUsage: number;
}

// ─── Types matching the main app's API responses (JSON-native) ─────────────

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

// ─── Validation response type ──────────────────────────────────────────────

export interface ValidateApiKeyResponse {
  valid: boolean;
  userId?: string;
  apiKeyId?: string;
  permissions?: string[];
  plan?: string;
  workspaceId?: string | null;
  rateLimit?: number;
  monthlyLimit?: number;
  monthlyUsage?: number;
  error?: string;
}

// ─── Usage tracking input type ─────────────────────────────────────────────

export interface TrackEventInput {
  userId: string;
  apiKeyId?: string;
  workspaceId?: string;
  eventType: string;
  toolName?: string;
  knowledgeId?: string;
  query?: string;
  durationMs?: number;
  tokensUsed?: number;
  tokenSaved?: number;
  success?: boolean;
  errorMessage?: string;
  userAgent?: string;
  ipAddress?: string;
}

// ─── HTTP Request Helper ───────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  authContext?: AuthContext | null
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Include API key in Authorization header if available
    if (authContext?.apiKey) {
      headers['Authorization'] = `Bearer ${authContext.apiKey}`;
    }

    const options: RequestInit = {
      method,
      headers,
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

// ─── API Key Validation ────────────────────────────────────────────────────

/**
 * Validate an API key by calling the Next.js validation endpoint.
 * This is called by the MCP server when a client connects.
 */
export async function validateApiKey(rawKey: string): Promise<ValidateApiKeyResponse> {
  const url = `${API_BASE_URL}/api/keys/validate?apiKey=${encodeURIComponent(rawKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    const data = await response.json() as ValidateApiKeyResponse;
    return data;
  } catch (error) {
    console.error('[API Client] Key validation request failed:', error);
    return { valid: false, error: 'Validation request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Usage Tracking ────────────────────────────────────────────────────────

/**
 * Track a usage event by calling the Next.js analytics endpoint.
 * Fire-and-forget — does not await or throw.
 */
export function trackUsage(input: TrackEventInput, authContext?: AuthContext | null): void {
  const url = `${API_BASE_URL}/api/analytics/track`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (authContext?.apiKey) {
    headers['Authorization'] = `Bearer ${authContext.apiKey}`;
  }

  fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  }).catch((err) => {
    console.error('[API Client] Usage tracking failed (non-blocking):', err);
  });
}

// ─── Knowledge API Functions ───────────────────────────────────────────────

/**
 * List knowledge documents, optionally filtered by category
 */
export async function listDocuments(
  category?: string,
  authContext?: AuthContext | null
): Promise<{ documents: KnowledgeDocumentSummary[] }> {
  const params = new URLSearchParams();
  if (category) {
    params.set('category', category);
  }
  const query = params.toString();
  const path = `/api/knowledge${query ? `?${query}` : ''}`;
  return request<{ documents: KnowledgeDocumentSummary[] }>('GET', path, undefined, authContext);
}

/**
 * Search knowledge documents using hybrid retrieval
 */
export async function searchKnowledge(
  query: string,
  limit?: number,
  category?: string,
  minScore?: number,
  authContext?: AuthContext | null
): Promise<{ results: SearchResult[] }> {
  const body: Record<string, unknown> = { query };
  if (limit !== undefined) body.limit = limit;
  if (category !== undefined) body.category = category;
  if (minScore !== undefined) body.minScore = minScore;

  return request<{ results: SearchResult[] }>('POST', '/api/knowledge/search', body, authContext);
}

/**
 * Get a single knowledge document by slug or ID
 */
export async function getDocument(
  slugOrId: string,
  authContext?: AuthContext | null
): Promise<{ document: KnowledgeDocumentSummary }> {
  return request<{ document: KnowledgeDocumentSummary }>('GET', `/api/knowledge/${encodeURIComponent(slugOrId)}`, undefined, authContext);
}

/**
 * Build context for AI agents from knowledge base
 */
export async function buildContext(
  query: string,
  maxDocuments?: number,
  maxTokenBudget?: number,
  category?: string,
  authContext?: AuthContext | null
): Promise<ContextBuildResponse> {
  const body: Record<string, unknown> = { query };
  if (maxDocuments !== undefined) body.maxDocuments = maxDocuments;
  if (maxTokenBudget !== undefined) body.maxTokenBudget = maxTokenBudget;
  if (category !== undefined) body.category = category;

  return request<ContextBuildResponse>('POST', '/api/knowledge/context', body, authContext);
}

/**
 * Health check - verify connectivity to the main app API
 * Uses the public /api/health endpoint (no auth required)
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE_URL}/api/health`, {
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
