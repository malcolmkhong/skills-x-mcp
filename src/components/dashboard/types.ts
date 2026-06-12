// ─────────────────────────────────────────────────────────────────────────────
// IndustryX Knowledge MCP Platform - Shared Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

// ─── Navigation ──────────────────────────────────────────────────────────────

export const NAV_TABS = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'knowledge', label: 'Knowledge', icon: 'Database' },
  { id: 'search', label: 'Search', icon: 'Search' },
  { id: 'keys', label: 'API Keys', icon: 'Key' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'mcp', label: 'MCP Server', icon: 'Server' },
  { id: 'workspaces', label: 'Workspaces', icon: 'Users' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
] as const

export type NavTabId = typeof NAV_TABS[number]['id']

// ─── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES = [
  'skills', 'sops', 'architecture', 'security', 'economy', 'deployment',
  'ui-standards', 'backend-standards', 'frontend-standards', 'game-economy',
  'trading', 'marketplace', 'anti-cheat', 'analytics', 'liveops', 'premium',
  'monetization', 'cloud-save', 'offline-sync',
] as const

export const CAT_COLORS: Record<string, string> = {
  'skills': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'sops': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'architecture': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'security': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'economy': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  'deployment': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'ui-standards': 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  'backend-standards': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'frontend-standards': 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
  'game-economy': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'trading': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
  'marketplace': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  'anti-cheat': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'analytics': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'liveops': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'premium': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'monetization': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'cloud-save': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'offline-sync': 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
}

export const CAT_BAR_COLORS: Record<string, string> = {
  'skills': '#10b981', 'sops': '#f59e0b', 'architecture': '#14b8a6',
  'security': '#ef4444', 'economy': '#06b6d4', 'deployment': '#f97316',
  'ui-standards': '#ec4899', 'backend-standards': '#14b8a6',
  'frontend-standards': '#84cc16', 'game-economy': '#eab308',
  'trading': '#d946ef', 'marketplace': '#f43f5e', 'anti-cheat': '#dc2626',
  'analytics': '#0ea5e9', 'liveops': '#8b5cf6', 'premium': '#d97706',
  'monetization': '#22c55e', 'cloud-save': '#0d9488', 'offline-sync': '#64748b',
}

// ─── Knowledge Types ─────────────────────────────────────────────────────────

export interface KnowledgeDoc {
  id: string
  slug: string
  title: string
  category: string
  description: string
  tags: string[]
  intents: string[]
  dependencies: string[]
  antiPatterns: string[]
  implementationSteps: string[]
  rules: string[]
  examples: Array<{ name: string; description: string }>
  references: string[]
  version: number
  schemaVersion: string
  accessCount: number
  relevanceScore: number
  isActive: boolean
  isPublic: boolean
  workspaceId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface SearchResultItem {
  id: string
  slug: string
  title: string
  category: string
  description: string
  tags: string[]
  intents: string[]
  score: number
  embeddingScore: number
  keywordScore: number
  categoryScore: number
  intentScore: number
  usageWeight: number
}

export interface ContextResult {
  context: string
  documentsUsed: number
  totalTokens: number
  sources: Array<{ slug: string; title: string; category: string; score: number }>
}

export interface KnowledgeStats {
  totalDocuments: number
  documentsByCategory: Record<string, number>
  totalRetirevals: number
  topAccessed: Array<{ id: string; slug: string; title: string; category: string; accessCount: number }>
  recentIngestions: Array<{
    id: string; operation: string; category: string | null
    documentsProcessed: number; status: string; startedAt: string; completedAt: string | null
  }>
}

// ─── API Key Types ───────────────────────────────────────────────────────────

export interface ApiKeyResponse {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  isRevoked: boolean
  revokedAt: string | null
  revokedReason: string | null
  rateLimit: number
  monthlyLimit: number
  monthlyUsage: number
  workspaceId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateApiKeyResult {
  apiKey: ApiKeyResponse
  rawKey: string
}

export interface ApiKeyUsageStat {
  dailyStats: Array<{
    date: string
    totalCalls: number
    successCalls: number
    errorCalls: number
  }>
  summary: {
    totalCalls: number
    successCalls: number
    errorCalls: number
    successRate: number
    byEventType: Record<string, number>
  }
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalApiCalls: number
  totalMcpCalls: number
  totalTokensSaved: number
  topKnowledge: Array<{ knowledgeId: string; title: string; category: string; accessCount: number }>
  usageByDay: Array<{ date: string; apiCalls: number; mcpCalls: number; totalCalls: number }>
  usageByCategory: Array<{ category: string; count: number }>
  activeApiKeys: number
  avgResponseTime: number
}

export interface MCPStats {
  callsByTool: Array<{ toolName: string; count: number }>
  callsByDay: Array<{ date: string; calls: number }>
  avgScores: Array<{ toolName: string; avgDurationMs: number; successRate: number }>
  mostPopularTools: Array<{ toolName: string; count: number }>
}

export interface KnowledgeAnalytics {
  mostAccessed: Array<{ knowledgeId: string; title: string; category: string; accessCount: number; avgScore: number }>
  categoryDistribution: Array<{ category: string; count: number; percentage: number }>
  retrievalTrends: Array<{ date: string; retrievals: number; avgScore: number }>
  topSearchQueries: Array<{ query: string; count: number; avgScore: number }>
  lowPerforming: Array<{ knowledgeId: string; title: string; category: string; avgScore: number; retrievalCount: number }>
}

export interface TokenSavingsAnalytics {
  totalTokensSaved: number
  totalTokensUsed: number
  savingsByDay: Array<{ date: string; tokensUsed: number; tokensSaved: number }>
  comparison: {
    fullContextTokens: number
    retrievedContextTokens: number
    savingsPercent: number
  }
}

export interface UsageEvent {
  id: string
  eventType: string
  toolName: string | null
  query: string | null
  durationMs: number
  tokensUsed: number
  tokenSaved: number
  success: boolean
  errorMessage: string | null
  createdAt: string
}

// ─── Workspace Types ─────────────────────────────────────────────────────────

export interface WorkspaceResponse {
  id: string
  name: string
  slug: string
  description: string
  icon: string | null
  isPersonal: boolean
  plan: string
  memberCount: number
  userRole: string
  createdAt: string
}

export interface WorkspaceMemberResponse {
  id: string
  userId: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  joinedAt: string
}

// ─── Plan Types ──────────────────────────────────────────────────────────────

export interface PlanWithFeatures {
  id: string
  name: string
  displayName: string
  description: string
  price: number
  currency: string
  interval: string
  apiRequestsPerMonth: number
  apiKeysLimit: number
  knowledgeUnitsLimit: number
  teamMembersLimit: number
  workspacesLimit: number
  features: string[]
  isPopular: boolean
  isActive: boolean
  sortOrder: number
}

export interface UserPlanDetails {
  planName: string
  subscriptionPlan: string
  displayName: string
  description: string
  price: number
  currency: string
  interval: string
  limits: {
    apiRequestsPerMonth: number
    apiKeysLimit: number
    knowledgeUnitsLimit: number
    teamMembersLimit: number
    workspacesLimit: number
  }
  features: string[]
  isPopular: boolean
  currentPeriodEnd: string | null
}

export interface PlanUsage {
  apiRequests: { used: number; limit: number }
  apiKeys: { used: number; limit: number }
  knowledgeUnits: { used: number; limit: number }
  teamMembers: { used: number; limit: number }
  workspaces: { used: number; limit: number }
}

// ─── MCP Types ───────────────────────────────────────────────────────────────

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, { type: string; description: string; default?: unknown }>
    required?: string[]
  }
}

export interface HealthStatus {
  status: string
  database: string
  userCount?: number
  timestamp?: string
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
  return data
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s
}
