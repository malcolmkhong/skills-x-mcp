'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  LayoutDashboard, Database, Search, Upload, Wrench, Sun, Moon,
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, X,
  RefreshCw, FileText, BarChart3, Activity, Clock, AlertCircle,
  CheckCircle2, Loader2, Zap, Brain, Shield, Server, Menu
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  { name: 'search_knowledge', desc: 'Search all knowledge', params: ['query', 'limit?'] },
  { name: 'retrieve_knowledge', desc: 'Get document by slug', params: ['slug'] },
  { name: 'build_context', desc: 'Build AI context', params: ['query', 'maxDocuments?', 'maxTokenBudget?'] },
  { name: 'search_skills', desc: 'Search skills', params: ['query', 'limit?'] },
  { name: 'search_sops', desc: 'Search SOPs', params: ['query', 'limit?'] },
  { name: 'search_architecture', desc: 'Search architecture', params: ['query', 'limit?'] },
  { name: 'search_security', desc: 'Search security', params: ['query', 'limit?'] },
  { name: 'search_game_system', desc: 'Search game systems', params: ['query', 'limit?'] },
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
  id: string; slug: string; title: string; category: Category
  description: string; keywords: string[]; markdownContent: string
  version: number; accessCount: number; isActive: boolean; createdAt: string; updatedAt: string
}

interface SearchResultItem {
  id: string; slug: string; title: string; category: Category
  description: string; score: number
  embeddingScore?: number; keywordScore?: number; categoryScore?: number; usageWeight?: number
}

interface Stats {
  totalDocuments: number; documentsByCategory: Record<string, number>; totalRetrievals: number
  topAccessed: Array<{ id: string; slug: string; title: string; category: string; accessCount: number }>
  recentIngestions: Array<{
    id: string; operation: string; category: string | null
    documentsProcessed: number; status: string; startedAt: string; completedAt: string | null
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function CategoryBadge({ category }: { category: string }) {
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800'}`}>{category}</Badge>
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options })
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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-white" />
              </div>
              {sidebarOpen && <div><div className="font-bold text-xs leading-tight">IndustryX</div><div className="text-[9px] text-muted-foreground">Knowledge MCP Provider</div></div>}
            </div>
          </div>
          <nav className="flex-1 p-1.5 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-accent'} ${!sidebarOpen ? 'justify-center' : ''}`}>
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-emerald-500' : ''}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>
          <div className="p-1.5 border-t border-border space-y-1">
            <Button variant="ghost" size={sidebarOpen ? 'default' : 'icon'} className="w-full h-7 text-xs" onClick={toggleTheme} suppressHydrationWarning>
              {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {sidebarOpen && <span className="ml-1">{resolvedTheme === 'dark' ? 'Light' : 'Dark'}</span>}
            </Button>
            <Button variant="ghost" size="icon" className="w-full h-7" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-2 p-2 border-b border-border bg-card sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileSidebarOpen(true)}><Menu className="h-4 w-4" /></Button>
          <Brain className="h-4 w-4 text-emerald-500" />
          <span className="font-bold text-xs">IndustryX MCP</span>
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-56 p-0">
            <SheetHeader className="p-3 border-b"><SheetTitle className="text-sm">Navigation</SheetTitle></SheetHeader>
            <nav className="p-2 space-y-1">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon
                return <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent">
                  <Icon className="h-3.5 w-3.5" /><span>{item.label}</span>
                </button>
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'knowledge' && <KnowledgeTab />}
            {activeTab === 'search' && <SearchTab />}
            {activeTab === 'ingest' && <IngestTab />}
            {activeTab === 'mcp' && <MCPToolsTab />}
          </div>
        </main>
      </div>

      <footer className="mt-auto border-t border-border bg-card px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground">
          <span>IndustryX Knowledge MCP Provider &copy; {new Date().getFullYear()}</span>
          <span className="flex items-center gap-1"><Server className="h-2.5 w-2.5" /> Skills Provider v1.0</span>
        </div>
      </footer>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try { setStats(await apiFetch<Stats>('/api/knowledge/stats')) }
    catch { toast.error('Failed to load stats') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const chartData = stats ? Object.entries(stats.documentsByCategory).map(([name, count]) => ({ name, count, fill: CATEGORY_BAR_COLORS[name] || '#6b7280' })).sort((a, b) => b.count - a.count) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Dashboard</h1><p className="text-muted-foreground text-xs">MCP Skills Provider Overview</p></div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}><RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Documents', value: stats?.totalDocuments ?? 0, icon: FileText, color: 'bg-emerald-500/10 text-emerald-600' },
          { title: 'Categories', value: stats ? Object.keys(stats.documentsByCategory).length : 0, icon: BarChart3, color: 'bg-violet-500/10 text-violet-600' },
          { title: 'Retrievals', value: stats?.totalRetrievals ?? 0, icon: Activity, color: 'bg-amber-500/10 text-amber-600' },
          { title: 'MCP Tools', value: 8, icon: Wrench, color: 'bg-cyan-500/10 text-cyan-600' },
        ].map(s => (
          <Card key={s.title}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div><p className="text-[10px] text-muted-foreground">{s.title}</p>{loading ? <Skeleton className="h-6 w-10 mt-0.5" /> : <p className="text-lg font-bold">{s.value.toLocaleString()}</p>}</div>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="h-4 w-4" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Documents by Category</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : chartData.length === 0 ? <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">No documents yet</div> : (
            <div className="space-y-1.5">
              {chartData.map(e => {
                const max = Math.max(...chartData.map(d => d.count), 1)
                return <div key={e.name} className="flex items-center gap-2">
                  <div className="w-24 text-[10px] text-muted-foreground truncate text-right">{e.name}</div>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(e.count / max) * 100}%`, backgroundColor: e.fill }} /></div>
                  <div className="w-6 text-[10px] font-medium text-right">{e.count}</div>
                </div>
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" />Top Accessed</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div> : (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {stats?.topAccessed.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent text-xs">
                      <div className="min-w-0 flex-1 mr-2"><div className="font-medium truncate">{doc.title}</div><div className="text-[10px] text-muted-foreground">{doc.slug}</div></div>
                      <div className="flex items-center gap-1.5 shrink-0"><CategoryBadge category={doc.category} /><Badge variant="secondary" className="text-[10px]">{doc.accessCount}</Badge></div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-sky-500" />Ingestion Logs</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div> : (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {stats?.recentIngestions.map(ing => (
                    <div key={ing.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent text-xs">
                      <div><div className="font-medium">{ing.operation}</div><div className="text-[10px] text-muted-foreground">{ing.category || 'All'} &middot; {formatDate(ing.startedAt)}</div></div>
                      <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px]">{ing.documentsProcessed} docs</Badge>
                        {ing.status === 'completed' ? <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Done</Badge> : <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">{ing.status}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Knowledge Tab ────────────────────────────────────────────────────────────

function KnowledgeTab() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<KnowledgeDoc | null>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const cat = categoryFilter !== 'all' ? categoryFilter : ''
      const data = await apiFetch<{ documents: KnowledgeDoc[] }>(`/api/knowledge${cat ? `?category=${cat}` : ''}`)
      setDocuments(data.documents)
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }, [categoryFilter])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold">Knowledge Base</h1><p className="text-muted-foreground text-xs">{documents.length} documents</p></div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchDocs}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Version</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Access</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {documents.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-xs"><div className="font-medium">{doc.title}</div><div className="text-[10px] text-muted-foreground">{doc.slug}</div></TableCell>
                    <TableCell><CategoryBadge category={doc.category} /></TableCell>
                    <TableCell className="text-xs hidden md:table-cell">v{doc.version}</TableCell>
                    <TableCell className="text-xs hidden md:table-cell">{doc.accessCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedDoc(doc)}><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteDoc(doc)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Document Detail */}
      <Sheet open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <SheetContent className="w-full md:w-[500px] overflow-y-auto">
          <SheetHeader><SheetTitle className="text-sm">{selectedDoc?.title}</SheetTitle><SheetDescription className="text-xs">{selectedDoc?.category} &middot; {selectedDoc?.slug}</SheetDescription></SheetHeader>
          {selectedDoc && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">{selectedDoc.description}</p>
              {selectedDoc.keywords.length > 0 && <div className="flex flex-wrap gap-1">{selectedDoc.keywords.map((kw, i) => <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>)}</div>}
              <Separator />
              <ScrollArea className="h-[60vh]">
                <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed bg-muted/30 p-3 rounded-lg">{selectedDoc.markdownContent}</pre>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="text-sm">Delete &ldquo;{deleteDoc?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">This will soft-delete the document. It can be restored later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={async () => {
              if (!deleteDoc) return
              try { await fetch(`/api/knowledge/${deleteDoc.id}`, { method: 'DELETE' }); toast.success('Deleted'); fetchDocs() }
              catch { toast.error('Delete failed') }
              setDeleteDoc(null)
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Search Tab ───────────────────────────────────────────────────────────────

function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [contextResult, setContextResult] = useState<{ context: string; documentsUsed: number; totalTokens: number } | null>(null)

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await apiFetch<{ results: SearchResultItem[] }>('/api/knowledge/search', {
        method: 'POST', body: JSON.stringify({ query, limit: 5 }),
      })
      setResults(data.results)
    } catch { toast.error('Search failed') }
    finally { setSearching(false) }
  }

  const buildContext = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await apiFetch<{ context: string; documentsUsed: number; totalTokens: number }>('/api/knowledge/context', {
        method: 'POST', body: JSON.stringify({ query, maxDocuments: 5, maxTokenBudget: 5000 }),
      })
      setContextResult(data)
    } catch { toast.error('Context build failed') }
    finally { setSearching(false) }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Search & Retrieve</h1><p className="text-muted-foreground text-xs">Test hybrid retrieval and context building</p></div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search knowledge..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="text-xs h-8" />
            <Button size="sm" onClick={doSearch} disabled={searching}>{searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}Search</Button>
            <Button size="sm" variant="outline" onClick={buildContext} disabled={searching}><Brain className="h-3 w-3 mr-1" />Context</Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Search Results</h3>
          {results.map(r => (
            <Card key={r.id} className="border-l-4" style={{ borderLeftColor: CATEGORY_BAR_COLORS[r.category] || '#6b7280' }}>
              <CardContent className="py-2 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-xs font-medium">{r.title}</div><div className="text-[10px] text-muted-foreground">{r.description}</div></div>
                  <div className="flex items-center gap-1.5 shrink-0"><CategoryBadge category={r.category} /><Badge variant="secondary" className="text-[10px]">{r.score.toFixed(3)}</Badge></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {contextResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assembled Context</CardTitle>
            <CardDescription className="text-[10px]">{contextResult.documentsUsed} docs &middot; ~{contextResult.totalTokens} tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <pre className="text-[10px] whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-lg">{contextResult.context}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Ingest Tab ───────────────────────────────────────────────────────────────

function IngestTab() {
  const [ingesting, setIngesting] = useState(false)
  const [result, setResult] = useState<{ totalProcessed: number; created: number; updated: number; skipped: number } | null>(null)
  const [rebuilding, setRebuilding] = useState(false)

  const doIngest = async (category?: string) => {
    setIngesting(true)
    try {
      const data = await apiFetch<{ totalProcessed: number; created: number; updated: number; skipped: number }>('/api/knowledge/ingest', {
        method: 'POST', body: JSON.stringify({ category: category || undefined }),
      })
      setResult(data)
      toast.success(`Ingested ${data.totalProcessed} docs (${data.created} new, ${data.updated} updated)`)
    } catch { toast.error('Ingestion failed') }
    finally { setIngesting(false) }
  }

  const doRebuild = async () => {
    setRebuilding(true)
    try {
      const data = await apiFetch<{ count: number }>('/api/knowledge/rebuild', { method: 'POST' })
      toast.success(`Rebuilt ${data.count} embeddings`)
    } catch { toast.error('Rebuild failed') }
    finally { setRebuilding(false) }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Knowledge Ingestion</h1><p className="text-muted-foreground text-xs">Scan and index markdown knowledge files</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Full Reindex</CardTitle><CardDescription className="text-[10px]">Scan all knowledge directories</CardDescription></CardHeader>
          <CardContent><Button size="sm" onClick={() => doIngest()} disabled={ingesting}>{ingesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}Ingest All</Button></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rebuild Embeddings</CardTitle><CardDescription className="text-[10px]">Regenerate all vector embeddings</CardDescription></CardHeader>
          <CardContent><Button size="sm" variant="outline" onClick={doRebuild} disabled={rebuilding}>{rebuilding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}Rebuild</Button></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Category Ingestion</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => <Button key={c} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => doIngest(c)} disabled={ingesting}>{c}</Button>)}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Last Ingestion Result</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Processed', value: result.totalProcessed, color: 'text-foreground' },
                { label: 'Created', value: result.created, color: 'text-emerald-600' },
                { label: 'Updated', value: result.updated, color: 'text-amber-600' },
                { label: 'Skipped', value: result.skipped, color: 'text-muted-foreground' },
              ].map(s => <div key={s.label}><div className={`text-lg font-bold ${s.color}`}>{s.value}</div><div className="text-[10px] text-muted-foreground">{s.label}</div></div>)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── MCP Tools Tab ────────────────────────────────────────────────────────────

function MCPToolsTab() {
  const [selectedTool, setSelectedTool] = useState(MCP_TOOLS[0])
  const [queryInput, setQueryInput] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [limitInput, setLimitInput] = useState('5')
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState('')

  const executeMCPTool = async () => {
    setExecuting(true)
    setResult('')
    try {
      let body: Record<string, unknown>
      if (selectedTool.name === 'retrieve_knowledge') {
        body = { slug: slugInput }
      } else {
        body = { query: queryInput, limit: parseInt(limitInput) || 5 }
        if (selectedTool.name === 'build_context') {
          body = { query: queryInput, maxDocuments: parseInt(limitInput) || 5, maxTokenBudget: 5000 }
        }
        if (selectedTool.name === 'search_skills') body = { ...body, category: 'skills' }
        if (selectedTool.name === 'search_sops') body = { ...body, category: 'sops' }
        if (selectedTool.name === 'search_architecture') body = { ...body, category: 'architecture' }
        if (selectedTool.name === 'search_security') body = { ...body, category: 'security' }
      }

      let endpoint = '/api/knowledge/search'
      if (selectedTool.name === 'retrieve_knowledge') endpoint = `/api/knowledge/${slugInput}`
      if (selectedTool.name === 'build_context') endpoint = '/api/knowledge/context'

      const method = selectedTool.name === 'retrieve_knowledge' ? 'GET' : 'POST'
      const data = await apiFetch<unknown>(endpoint, { method, body: method === 'POST' ? body : undefined })
      setResult(JSON.stringify(data, null, 2))
      toast.success('Tool executed successfully')
    } catch (e) { setResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`); toast.error('Execution failed') }
    finally { setExecuting(false) }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">MCP Tools</h1><p className="text-muted-foreground text-xs">Test MCP tool calls that AI agents would use</p></div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Select Tool</CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {MCP_TOOLS.map(t => (
              <Button key={t.name} variant={selectedTool.name === t.name ? 'default' : 'outline'} size="sm" className="text-[10px] h-6"
                onClick={() => setSelectedTool(t)}>{t.name}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{selectedTool.desc}</p>

          {selectedTool.name !== 'retrieve_knowledge' && (
            <div><Label className="text-xs">Query</Label><Input placeholder="Enter search query..." value={queryInput} onChange={e => setQueryInput(e.target.value)} className="text-xs h-8 mt-1" /></div>
          )}
          {selectedTool.name === 'retrieve_knowledge' && (
            <div><Label className="text-xs">Slug</Label><Input placeholder="e.g., cloud-save" value={slugInput} onChange={e => setSlugInput(e.target.value)} className="text-xs h-8 mt-1" /></div>
          )}
          <div><Label className="text-xs">Limit</Label><Input type="number" value={limitInput} onChange={e => setLimitInput(e.target.value)} className="text-xs h-8 mt-1 w-20" /></div>

          <Button size="sm" onClick={executeMCPTool} disabled={executing}>
            {executing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}Execute {selectedTool.name}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Result</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-72"><pre className="text-[10px] whitespace-pre-wrap font-mono">{result}</pre></ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
