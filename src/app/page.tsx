'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  LayoutDashboard, Database, Search, Upload, Wrench, Sun, Moon,
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, X,
  RefreshCw, FileText, BarChart3, Activity, Clock, AlertCircle,
  CheckCircle2, Loader2, Zap, Brain, Shield, Server,
  Menu, ChevronDown, Copy
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip as TooltipComponent, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'skills', 'sops', 'architecture', 'security', 'economy', 'deployment',
  'ui-standards', 'backend-standards', 'frontend-standards', 'game-economy',
  'trading', 'marketplace', 'anti-cheat', 'analytics', 'liveops', 'premium',
  'monetization', 'cloud-save', 'offline-sync',
] as const

type Category = typeof CATEGORIES[number]

const CATEGORY_COLORS: Record<string, string> = {
  'skills': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'sops': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'architecture': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
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
  'liveops': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  'premium': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'monetization': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'cloud-save': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'offline-sync': 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
}

const CATEGORY_BAR_COLORS: Record<string, string> = {
  'skills': '#10b981', 'sops': '#f59e0b', 'architecture': '#8b5cf6',
  'security': '#ef4444', 'economy': '#06b6d4', 'deployment': '#f97316',
  'ui-standards': '#ec4899', 'backend-standards': '#14b8a6',
  'frontend-standards': '#84cc16', 'game-economy': '#eab308',
  'trading': '#d946ef', 'marketplace': '#f43f5e', 'anti-cheat': '#dc2626',
  'analytics': '#0ea5e9', 'liveops': '#6366f1', 'premium': '#d97706',
  'monetization': '#22c55e', 'cloud-save': '#3b82f6', 'offline-sync': '#64748b',
}

const MCP_TOOLS = [
  { name: 'search_knowledge', description: 'General knowledge search with hybrid retrieval', params: ['query', 'limit?', 'category?', 'minScore?'] },
  { name: 'retrieve_knowledge', description: 'Get full document by slug', params: ['slug'] },
  { name: 'search_skills', description: 'Search in "skills" category', params: ['query', 'limit?'] },
  { name: 'search_sops', description: 'Search in "sops" category', params: ['query', 'limit?'] },
  { name: 'search_architecture', description: 'Search in "architecture" category', params: ['query', 'limit?'] },
  { name: 'search_security', description: 'Search in "security" category', params: ['query', 'limit?'] },
  { name: 'search_game_system', description: 'Multi-category search (game-economy, trading, marketplace, monetization, premium, anti-cheat)', params: ['query', 'limit?'] },
]

const NAV_ITEMS = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'knowledge' as const, label: 'Knowledge Base', icon: Database },
  { id: 'search' as const, label: 'Search & Retrieve', icon: Search },
  { id: 'ingest' as const, label: 'Ingest', icon: Upload },
  { id: 'mcp' as const, label: 'MCP Tools', icon: Wrench },
]

type NavTab = typeof NAV_ITEMS[number]['id']

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string
  slug: string
  title: string
  category: Category
  description: string
  keywords: string[]
  markdownContent: string
  version: number
  accessCount: number
  relevanceScore: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SearchResultItem {
  id: string
  slug: string
  title: string
  category: Category
  description: string
  score: number
  embeddingScore?: number
  keywordScore?: number
  categoryScore?: number
  usageWeight?: number
}

interface ContextResult {
  context: string
  documentsUsed: number
  totalTokens: number
  sources: Array<{ slug: string; title: string; category: Category; score: number }>
}

interface Stats {
  totalDocuments: number
  documentsByCategory: Record<string, number>
  totalRetrievals: number
  topAccessed: Array<{ id: string; slug: string; title: string; category: string; accessCount: number }>
  recentIngestions: Array<{
    id: string; operation: string; category: string | null;
    documentsProcessed: number; status: string; startedAt: string; completedAt: string | null
  }>
}

interface IngestionResult {
  totalProcessed: number
  created: number
  updated: number
  skipped: number
  errors: Array<{ file: string; error: string }>
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
      {category}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
  if (status === 'running') return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>
  if (status === 'failed') return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>
  return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
  return data
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className={`
            hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'w-64' : 'w-16'}
          `}>
            <SidebarContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collapsed={!sidebarOpen}
              toggleTheme={toggleTheme}
              resolvedTheme={resolvedTheme}
            />
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="icon" className="w-full" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </aside>

          {/* Mobile Sidebar Overlay */}
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent
                activeTab={activeTab}
                setActiveTab={(tab) => { setActiveTab(tab); setMobileSidebarOpen(false) }}
                collapsed={false}
                toggleTheme={toggleTheme}
                resolvedTheme={resolvedTheme}
              />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center gap-2 p-3 border-b border-border bg-card sticky top-0 z-10">
              <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-500" />
                <span className="font-bold text-sm">IndustryX MCP</span>
              </div>
            </div>

            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
              <div key={activeTab} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'knowledge' && <KnowledgeTab />}
                {activeTab === 'search' && <SearchTab />}
                {activeTab === 'ingest' && <IngestTab />}
                {activeTab === 'mcp' && <MCPToolsTab />}
              </div>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-card px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>IndustryX Knowledge MCP Server &copy; {new Date().getFullYear()}</span>
            <span className="flex items-center gap-1">
              <Server className="h-3 w-3" /> Admin Dashboard v1.0
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────

function SidebarContent({
  activeTab, setActiveTab, collapsed, toggleTheme, resolvedTheme,
}: {
  activeTab: NavTab
  setActiveTab: (t: NavTab) => void
  collapsed: boolean
  toggleTheme: () => void
  resolvedTheme?: string
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <Brain className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-bold text-sm leading-tight">IndustryX</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Knowledge MCP Server</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <TooltipComponent key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : ''}`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
            </TooltipComponent>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-2 border-t border-border">
        <Button variant="ghost" size={collapsed ? 'icon' : 'default'} className="w-full" onClick={toggleTheme} suppressHydrationWarning>
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </Button>
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Stats>('/api/knowledge/stats')
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const chartData = stats
    ? Object.entries(stats.documentsByCategory)
        .map(([name, count]) => ({ name, count, fill: CATEGORY_BAR_COLORS[name] || '#6b7280' }))
        .sort((a, b) => b.count - a.count)
    : []

  const avgAccess = stats && stats.topAccessed.length > 0
    ? Math.round(stats.topAccessed.reduce((s, d) => s + d.accessCount, 0) / stats.topAccessed.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm">Monitor your knowledge base at a glance</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={stats?.totalDocuments ?? 0}
          icon={FileText}
          loading={loading}
          color="emerald"
        />
        <StatCard
          title="Total Categories"
          value={stats ? Object.keys(stats.documentsByCategory).length : 0}
          icon={BarChart3}
          loading={loading}
          color="violet"
        />
        <StatCard
          title="Total Retrievals"
          value={stats?.totalRetrievals ?? 0}
          icon={Activity}
          loading={loading}
          color="amber"
        />
        <StatCard
          title="Avg Access Count"
          value={avgAccess}
          icon={Zap}
          loading={loading}
          color="cyan"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents by Category</CardTitle>
          <CardDescription>Distribution across knowledge categories</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No documents yet. Start by ingesting knowledge.
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {chartData.map((entry) => {
                const maxCount = Math.max(...chartData.map(d => d.count), 1)
                const widthPercent = (entry.count / maxCount) * 100
                return (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-muted-foreground truncate text-right">{entry.name}</div>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${widthPercent}%`, backgroundColor: entry.fill }}
                      />
                    </div>
                    <div className="w-8 text-xs font-medium text-right">{entry.count}</div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Accessed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Top Accessed</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (stats?.topAccessed?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No access data yet</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {stats?.topAccessed.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="text-sm font-medium truncate">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">{doc.slug}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CategoryBadge category={doc.category} />
                      <Badge variant="secondary" className="text-xs">{doc.accessCount}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Ingestions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-sky-500" /> Recent Ingestions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (stats?.recentIngestions?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No ingestion logs yet</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {stats?.recentIngestions.map(ing => (
                  <div key={ing.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="text-sm font-medium">{ing.operation}</div>
                      <div className="text-xs text-muted-foreground">
                        {ing.category || 'All categories'} &middot; {formatDate(ing.startedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{ing.documentsProcessed} docs</Badge>
                      <StatusBadge status={ing.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, loading, color }: {
  title: string; value: number; icon: React.ElementType; loading: boolean; color: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  }
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
            )}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Knowledge Tab ────────────────────────────────────────────────────────────

function KnowledgeTab() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<KnowledgeDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<KnowledgeDoc | null>(null)
  const [deleteHard, setDeleteHard] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const url = categoryFilter !== 'all' ? `/api/knowledge?category=${categoryFilter}` : '/api/knowledge'
      const data = await apiFetch<{ documents: KnowledgeDoc[] }>(url)
      setDocuments(data.documents || [])
    } catch {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleView = async (doc: KnowledgeDoc) => {
    try {
      const data = await apiFetch<{ document: KnowledgeDoc }>(`/api/knowledge/${doc.id}`)
      setSelectedDoc(data.document)
      setDetailOpen(true)
    } catch {
      toast.error('Failed to load document')
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      await apiFetch(`/api/knowledge/${deleteDoc.id}${deleteHard ? '?hard=true' : ''}`, { method: 'DELETE' })
      toast.success(`Document ${deleteHard ? 'permanently deleted' : 'soft deleted'}`)
      setDeleteDoc(null)
      fetchDocs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm">Manage and browse your knowledge documents</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by title, slug, or description..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
            className="h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(0) }}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchDocs}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No documents found</p>
              <p className="text-xs mt-1">Try adjusting your filters or add new documents</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden md:table-cell">Slug</TableHead>
                      <TableHead className="hidden lg:table-cell">Version</TableHead>
                      <TableHead className="hidden sm:table-cell">Access</TableHead>
                      <TableHead className="hidden lg:table-cell">Updated</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map(doc => (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleView(doc)}>
                        <TableCell className="font-medium">
                          <div className="truncate max-w-[260px]">{doc.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{doc.description}</div>
                        </TableCell>
                        <TableCell><CategoryBadge category={doc.category} /></TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">{doc.slug}</TableCell>
                        <TableCell className="hidden lg:table-cell"><Badge variant="secondary" className="text-xs">v{doc.version}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{doc.accessCount}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(doc.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <TooltipComponent>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(doc)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View</TooltipContent>
                            </TooltipComponent>
                            <TooltipComponent>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditDoc(doc)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </TooltipComponent>
                            <TooltipComponent>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeleteDoc(doc); setDeleteHard(false) }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </TooltipComponent>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedDoc?.title}
              {selectedDoc && <CategoryBadge category={selectedDoc.category} />}
            </SheetTitle>
            <SheetDescription>{selectedDoc?.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {selectedDoc && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Slug:</span> <span className="font-mono text-xs">{selectedDoc.slug}</span></div>
                  <div><span className="text-muted-foreground">Version:</span> v{selectedDoc.version}</div>
                  <div><span className="text-muted-foreground">Access Count:</span> {selectedDoc.accessCount}</div>
                  <div><span className="text-muted-foreground">Active:</span> {selectedDoc.isActive ? 'Yes' : 'No'}</div>
                  <div><span className="text-muted-foreground">Created:</span> {formatDate(selectedDoc.createdAt)}</div>
                  <div><span className="text-muted-foreground">Updated:</span> {formatDate(selectedDoc.updatedAt)}</div>
                </div>
                {selectedDoc.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedDoc.keywords.map((kw, i) => <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>)}
                  </div>
                )}
                <Separator />
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-xs leading-relaxed bg-muted/30 p-4 rounded-lg overflow-auto max-h-[500px]">
                  {selectedDoc.markdownContent}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Document Dialog */}
      <DocumentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => { setCreateOpen(false); fetchDocs() }}
        mode="create"
      />

      {/* Edit Document Dialog */}
      <DocumentFormDialog
        open={!!editDoc}
        onOpenChange={open => { if (!open) setEditDoc(null) }}
        document={editDoc}
        onSuccess={() => { setEditDoc(null); fetchDocs() }}
        mode="edit"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={open => { if (!open) setDeleteDoc(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDoc?.title}</strong>?
              <div className="mt-3 flex items-center gap-2">
                <Switch checked={deleteHard} onCheckedChange={setDeleteHard} id="hard-delete" />
                <Label htmlFor="hard-delete" className="text-sm font-medium">Hard delete (permanent)</Label>
              </div>
              {deleteHard && (
                <p className="text-destructive text-xs mt-2">
                  Warning: Hard delete is permanent and cannot be undone. The document and all associated data will be removed.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {deleteHard ? 'Permanently Delete' : 'Soft Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Document Form Dialog ─────────────────────────────────────────────────────

function DocumentFormDialog({
  open, onOpenChange, document: doc, onSuccess, mode,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  document?: KnowledgeDoc | null; onSuccess: () => void; mode: 'create' | 'edit'
}) {
  const [form, setForm] = useState({
    slug: '', title: '', category: 'skills' as string, description: '',
    keywords: '', markdownContent: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (doc && mode === 'edit') {
      setForm({
        slug: doc.slug, title: doc.title, category: doc.category,
        description: doc.description,
        keywords: Array.isArray(doc.keywords) ? doc.keywords.join(', ') : '',
        markdownContent: doc.markdownContent,
      })
    } else if (mode === 'create') {
      setForm({ slug: '', title: '', category: 'skills', description: '', keywords: '', markdownContent: '' })
    }
  }, [doc, mode])

  const handleSave = async () => {
    if (!form.slug || !form.title || !form.markdownContent) {
      toast.error('Slug, title, and markdown content are required')
      return
    }
    setSaving(true)
    try {
      const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean)
      const body = {
        slug: form.slug,
        title: form.title,
        category: form.category,
        description: form.description,
        keywords,
        markdownContent: form.markdownContent,
      }
      if (mode === 'create') {
        await apiFetch('/api/knowledge', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Document created')
      } else if (doc) {
        await apiFetch(`/api/knowledge/${doc.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Document updated')
      }
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Document' : 'Edit Document'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new knowledge document' : `Editing: ${doc?.title}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="my-document-slug" disabled={mode === 'edit'} />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
          </div>
          <div className="space-y-2">
            <Label>Keywords (comma-separated)</Label>
            <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="keyword1, keyword2, keyword3" />
          </div>
          <div className="space-y-2">
            <Label>Markdown Content *</Label>
            <Textarea
              value={form.markdownContent}
              onChange={e => setForm(f => ({ ...f, markdownContent: e.target.value }))}
              placeholder="# My Document\n\nContent here..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Search Tab ───────────────────────────────────────────────────────────────

function SearchTab() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [limit, setLimit] = useState(5)
  const [minScore, setMinScore] = useState(0.1)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  // Context builder
  const [contextQuery, setContextQuery] = useState('')
  const [contextCategory, setContextCategory] = useState<string>('all')
  const [contextMaxDocs, setContextMaxDocs] = useState(5)
  const [contextTokenBudget, setContextTokenBudget] = useState(5000)
  const [contextResult, setContextResult] = useState<ContextResult | null>(null)
  const [buildingContext, setBuildingContext] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) { toast.error('Enter a search query'); return }
    setSearching(true)
    setSearched(true)
    try {
      const body: Record<string, unknown> = { query, limit, minScore }
      if (category !== 'all') body.category = category
      const data = await apiFetch<{ results: SearchResultItem[] }>('/api/knowledge/search', {
        method: 'POST', body: JSON.stringify(body),
      })
      setResults(data.results || [])
      if (data.results?.length === 0) toast.info('No results found')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleBuildContext = async () => {
    if (!contextQuery.trim()) { toast.error('Enter a query for context building'); return }
    setBuildingContext(true)
    try {
      const body: Record<string, unknown> = { query: contextQuery, maxDocuments: contextMaxDocs, maxTokenBudget: contextTokenBudget }
      if (contextCategory !== 'all') body.category = contextCategory
      const data = await apiFetch<ContextResult>('/api/knowledge/context', {
        method: 'POST', body: JSON.stringify(body),
      })
      setContextResult(data)
      toast.success(`Context built: ${data.documentsUsed} documents, ~${data.totalTokens} tokens`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Context build failed')
    } finally {
      setBuildingContext(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search & Retrieve</h1>
        <p className="text-muted-foreground text-sm">Test hybrid search and context building</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-emerald-500" /> Hybrid Search</CardTitle>
            <CardDescription>Search across your knowledge base with semantic + keyword matching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search query..." onKeyDown={e => e.key === 'Enter' && handleSearch()} className="flex-1" />
              <Button onClick={handleSearch} disabled={searching} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Label className="text-xs whitespace-nowrap">Limit: {limit}</Label>
                <Slider value={[limit]} onValueChange={([v]) => setLimit(v)} min={1} max={20} step={1} className="flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Min Score:</Label>
                <Input type="number" value={minScore} onChange={e => setMinScore(Number(e.target.value))} step={0.05} min={0} max={1} className="w-20 h-8 text-xs" />
              </div>
            </div>

            {/* Results */}
            {searching ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
            ) : searched && results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No results found for this query</div>
            ) : (
              <div className="space-y-3">
                {results.map(r => (
                  <div key={r.id} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                    <Card className="border-l-4" style={{ borderLeftColor: CATEGORY_BAR_COLORS[r.category] || '#6b7280' }}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{r.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{(r.score * 100).toFixed(1)}%</div>
                            <CategoryBadge category={r.category} />
                          </div>
                        </div>
                        {(r.embeddingScore !== undefined || r.keywordScore !== undefined) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {r.embeddingScore !== undefined && (
                              <Badge variant="secondary" className="text-[10px]">
                                Embedding: {(r.embeddingScore * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {r.keywordScore !== undefined && (
                              <Badge variant="secondary" className="text-[10px]">
                                Keyword: {(r.keywordScore * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {r.categoryScore !== undefined && (
                              <Badge variant="secondary" className="text-[10px]">
                                Category: {(r.categoryScore * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {r.usageWeight !== undefined && (
                              <Badge variant="secondary" className="text-[10px]">
                                Usage: {(r.usageWeight * 100).toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Context Builder Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-violet-500" /> Context Builder</CardTitle>
            <CardDescription>Assemble context from multiple documents for AI consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={contextQuery} onChange={e => setContextQuery(e.target.value)} placeholder="Query for context..." onKeyDown={e => e.key === 'Enter' && handleBuildContext()} className="flex-1" />
              <Button onClick={handleBuildContext} disabled={buildingContext} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                {buildingContext ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={contextCategory} onValueChange={setContextCategory}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                <Label className="text-xs whitespace-nowrap">Max Docs: {contextMaxDocs}</Label>
                <Slider value={[contextMaxDocs]} onValueChange={([v]) => setContextMaxDocs(v)} min={1} max={20} step={1} className="flex-1" />
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                <Label className="text-xs whitespace-nowrap">Tokens: {contextTokenBudget}</Label>
                <Slider value={[contextTokenBudget]} onValueChange={([v]) => setContextTokenBudget(v)} min={1000} max={20000} step={500} className="flex-1" />
              </div>
            </div>

            {buildingContext ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : contextResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-0">
                    <FileText className="w-3 h-3 mr-1" /> {contextResult.documentsUsed} documents
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                    <Zap className="w-3 h-3 mr-1" /> ~{contextResult.totalTokens} tokens
                  </Badge>
                  <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => { navigator.clipboard.writeText(contextResult.context); toast.success('Context copied!') }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                {contextResult.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {contextResult.sources.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{s.title} ({(s.score * 100).toFixed(0)}%)</Badge>
                    ))}
                  </div>
                )}
                <ScrollArea className="h-64 rounded-lg border border-border">
                  <pre className="p-3 text-xs whitespace-pre-wrap font-mono">{contextResult.context}</pre>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Enter a query and build context</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Ingest Tab ───────────────────────────────────────────────────────────────

function IngestTab() {
  const [ingesting, setIngesting] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('skills')
  const [lastResult, setLastResult] = useState<IngestionResult | null>(null)
  const [logs, setLogs] = useState<Stats['recentIngestions']>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiFetch<Stats>('/api/knowledge/stats')
      setLogs(data.recentIngestions || [])
    } catch {
      toast.error('Failed to load ingestion logs')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleFullIngest = async () => {
    setIngesting(true)
    try {
      const data = await apiFetch<IngestionResult>('/api/knowledge/ingest', {
        method: 'POST', body: JSON.stringify({}),
      })
      setLastResult(data)
      toast.success(`Ingestion complete: ${data.created} created, ${data.updated} updated, ${data.skipped} skipped`)
      fetchLogs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ingestion failed')
    } finally {
      setIngesting(false)
    }
  }

  const handleCategoryIngest = async () => {
    setIngesting(true)
    try {
      const data = await apiFetch<IngestionResult>('/api/knowledge/ingest', {
        method: 'POST', body: JSON.stringify({ category: selectedCategory }),
      })
      setLastResult(data)
      toast.success(`Ingestion complete for ${selectedCategory}: ${data.created} created, ${data.updated} updated`)
      fetchLogs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ingestion failed')
    } finally {
      setIngesting(false)
    }
  }

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      const data = await apiFetch<{ message: string; count: number }>('/api/knowledge/rebuild', { method: 'POST' })
      toast.success(data.message)
      fetchLogs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rebuild failed')
    } finally {
      setRebuilding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ingestion</h1>
        <p className="text-muted-foreground text-sm">Trigger knowledge ingestion and manage embeddings</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4 text-emerald-500" /> Full Reindex</CardTitle>
            <CardDescription>Ingest all categories from the knowledge base</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFullIngest} disabled={ingesting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {ingesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Full Reindex
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-amber-500" /> Category Ingest</CardTitle>
            <CardDescription>Ingest a specific category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleCategoryIngest} disabled={ingesting} className="w-full" variant="outline">
              {ingesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Ingest {selectedCategory}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-violet-500" /> Rebuild Embeddings</CardTitle>
            <CardDescription>Regenerate embeddings for all documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRebuild} disabled={rebuilding} className="w-full" variant="outline">
              {rebuilding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Rebuild All Embeddings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Last Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Last Ingestion Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{lastResult.created}</div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lastResult.updated}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-sky-500/10">
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{lastResult.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-violet-500/10">
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{lastResult.totalProcessed}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
            {lastResult.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-destructive">Errors:</div>
                {lastResult.errors.map((err, i) => (
                  <div key={i} className="text-xs text-destructive bg-destructive/10 rounded p-2">
                    {err.file}: {err.error}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ingestion Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-sky-500" /> Ingestion Logs</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchLogs}>
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No ingestion logs yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.operation}</TableCell>
                      <TableCell>{log.category ? <CategoryBadge category={log.category} /> : <span className="text-xs text-muted-foreground">All</span>}</TableCell>
                      <TableCell className="text-sm">{log.documentsProcessed}</TableCell>
                      <TableCell><StatusBadge status={log.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(log.startedAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.completedAt ? formatDate(log.completedAt) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── MCP Tools Tab ────────────────────────────────────────────────────────────

function MCPToolsTab() {
  const [selectedTool, setSelectedTool] = useState(MCP_TOOLS[0])
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    // Reset param values when tool changes
    const defaults: Record<string, string> = {}
    selectedTool.params.forEach(p => {
      const name = p.replace('?', '')
      if (name === 'limit') defaults[name] = '5'
      else if (name === 'minScore') defaults[name] = '0.1'
      else if (name === 'slug') defaults[name] = ''
      else defaults[name] = ''
    })
    setParamValues(defaults)
  }, [selectedTool])

  const handleExecute = async () => {
    setExecuting(true)
    setResult(null)
    try {
      let endpoint = ''
      let body: Record<string, unknown> = {}

      switch (selectedTool.name) {
        case 'search_knowledge':
        case 'search_skills':
        case 'search_sops':
        case 'search_architecture':
        case 'search_security': {
          endpoint = '/api/knowledge/search'
          body = { query: paramValues.query || '' }
          if (paramValues.limit) body.limit = parseInt(paramValues.limit)
          if (paramValues.minScore) body.minScore = parseFloat(paramValues.minScore)
          if (selectedTool.name !== 'search_knowledge') {
            const categoryMap: Record<string, string> = {
              search_skills: 'skills', search_sops: 'sops',
              search_architecture: 'architecture', search_security: 'security',
            }
            body.category = categoryMap[selectedTool.name]
          }
          if (selectedTool.name === 'search_knowledge' && paramValues.category) {
            body.category = paramValues.category
          }
          break
        }
        case 'retrieve_knowledge': {
          const slug = paramValues.slug
          if (!slug) throw new Error('slug is required')
          endpoint = `/api/knowledge/${slug}`
          const data = await apiFetch<{ document: KnowledgeDoc }>(endpoint)
          setResult(JSON.stringify(data.document, null, 2))
          setResultType('success')
          setExecuting(false)
          return
        }
        case 'search_game_system': {
          endpoint = '/api/knowledge/search'
          body = { query: paramValues.query || '' }
          if (paramValues.limit) body.limit = parseInt(paramValues.limit)
          // Search across multiple game categories
          const gameCategories = ['game-economy', 'trading', 'marketplace', 'monetization', 'premium', 'anti-cheat']
          const allResults: SearchResultItem[] = []
          for (const cat of gameCategories) {
            try {
              const data = await apiFetch<{ results: SearchResultItem[] }>('/api/knowledge/search', {
                method: 'POST', body: JSON.stringify({ ...body, category: cat, limit: 2 }),
              })
              allResults.push(...(data.results || []))
            } catch { /* skip */ }
          }
          allResults.sort((a, b) => b.score - a.score)
          setResult(JSON.stringify({ results: allResults.slice(0, parseInt(paramValues.limit || '5')) }, null, 2))
          setResultType('success')
          setExecuting(false)
          return
        }
      }

      if (!endpoint) throw new Error('Unknown tool')

      const data = await apiFetch<{ results: SearchResultItem[] }>(endpoint, {
        method: 'POST', body: JSON.stringify(body),
      })
      setResult(JSON.stringify(data, null, 2))
      setResultType('success')
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Execution failed')
      setResultType('error')
    } finally {
      setExecuting(false)
    }
  }

  const toolIcon = (name: string) => {
    if (name.includes('skill')) return <Zap className="h-4 w-4 text-emerald-500" />
    if (name.includes('sop')) return <FileText className="h-4 w-4 text-amber-500" />
    if (name.includes('architect')) return <LayoutDashboard className="h-4 w-4 text-violet-500" />
    if (name.includes('securit')) return <Shield className="h-4 w-4 text-red-500" />
    if (name.includes('game')) return <Activity className="h-4 w-4 text-cyan-500" />
    if (name.includes('retrieve')) return <Eye className="h-4 w-4 text-sky-500" />
    return <Search className="h-4 w-4 text-emerald-500" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MCP Tools</h1>
        <p className="text-muted-foreground text-sm">Test MCP tool calls directly from the dashboard</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Tool Selection & Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-emerald-500" /> Tool Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tool</Label>
              <Select value={selectedTool.name} onValueChange={v => {
                const tool = MCP_TOOLS.find(t => t.name === v)
                if (tool) setSelectedTool(tool)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MCP_TOOLS.map(tool => (
                    <SelectItem key={tool.name} value={tool.name}>
                      <div className="flex items-center gap-2">
                        {toolIcon(tool.name)}
                        <span>{tool.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedTool.description}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Parameters</Label>
              {selectedTool.params.map(param => {
                const name = param.replace('?', '')
                const required = !param.endsWith('?')
                return (
                  <div key={name} className="space-y-1">
                    <Label className="text-xs">
                      {name} {required && <span className="text-destructive">*</span>}
                      {!required && <span className="text-muted-foreground">(optional)</span>}
                    </Label>
                    {name === 'category' ? (
                      <Select value={paramValues[name] || ''} onValueChange={v => setParamValues(p => ({ ...p, [name]: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={paramValues[name] || ''}
                        onChange={e => setParamValues(p => ({ ...p, [name]: e.target.value }))}
                        placeholder={name === 'query' ? 'Enter search query...' : name === 'slug' ? 'document-slug' : name}
                        className="h-9"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <Button onClick={handleExecute} disabled={executing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Execute Tool
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {resultType === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                Result
              </CardTitle>
              {result && (
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {executing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-sm text-muted-foreground mt-3">Executing {selectedTool.name}...</p>
              </div>
            ) : result ? (
              <ScrollArea className="h-96 rounded-lg border border-border">
                <pre className={`p-3 text-xs whitespace-pre-wrap font-mono ${resultType === 'error' ? 'text-destructive' : ''}`}>{result}</pre>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Configure a tool and click Execute</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
