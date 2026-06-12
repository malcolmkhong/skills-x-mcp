'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  LayoutDashboard, Database, Search, Upload, Wrench, Sun, Moon,
  Plus, Pencil, Trash2, Eye, X, RefreshCw, FileText, BarChart3,
  Activity, Clock, CheckCircle2, Loader2, Zap, Brain, Shield,
  Server, Menu, ChevronDown, ChevronUp, Target, AlertTriangle,
  ListOrdered, BookOpen, Lightbulb, Link2, GitBranch
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

const CAT_COLORS: Record<string, string> = {
  'skills': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'sops': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'architecture': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'security': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'economy': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  'deployment': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
}

const CAT_BAR: Record<string, string> = {
  'skills': '#10b981', 'sops': '#f59e0b', 'architecture': '#14b8a6',
  'security': '#ef4444', 'economy': '#06b6d4', 'deployment': '#f97316',
  'ui-standards': '#ec4899', 'backend-standards': '#14b8a6',
  'frontend-standards': '#84cc16', 'game-economy': '#eab308',
  'trading': '#d946ef', 'marketplace': '#f43f5e', 'anti-cheat': '#dc2626',
  'analytics': '#0ea5e9', 'liveops': '#8b5cf6', 'premium': '#d97706',
  'monetization': '#22c55e', 'cloud-save': '#0d9488', 'offline-sync': '#64748b',
}

const MCP_TOOLS = [
  { name: 'search_knowledge', desc: 'Search all knowledge', params: ['query', 'limit?'] },
  { name: 'retrieve_knowledge', desc: 'Get document by slug', params: ['slug'] },
  { name: 'build_context', desc: 'Build AI context', params: ['query', 'maxDocuments?', 'maxTokenBudget?'] },
  { name: 'search_skills', desc: 'Search skills category', params: ['query', 'limit?'] },
  { name: 'search_sops', desc: 'Search SOPs category', params: ['query', 'limit?'] },
  { name: 'search_architecture', desc: 'Search architecture category', params: ['query', 'limit?'] },
  { name: 'search_security', desc: 'Search security category', params: ['query', 'limit?'] },
  { name: 'search_game_system', desc: 'Search game systems', params: ['query', 'limit?'] },
]

const NAV = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'knowledge' as const, label: 'Knowledge Base', icon: Database },
  { id: 'search' as const, label: 'Search & Retrieve', icon: Search },
  { id: 'ingest' as const, label: 'Ingest', icon: Upload },
  { id: 'mcp' as const, label: 'MCP Tools', icon: Wrench },
]

const ARCH_NAV = { id: 'architecture' as const, label: 'Architecture', icon: GitBranch }

type NavTab = typeof NAV[number]['id']

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string; slug: string; title: string; category: string
  description: string; tags: string[]; intents: string[]
  dependencies: string[]; antiPatterns: string[]
  implementationSteps: string[]; rules: string[]
  examples: Array<{ name: string; description: string }>
  references: string[]; version: number; schemaVersion: string
  accessCount: number; isActive: boolean; createdAt: string; updatedAt: string
}

interface SearchResultItem {
  id: string; slug: string; title: string; category: string
  description: string; tags: string[]; intents: string[]
  score: number; embeddingScore: number; keywordScore: number
  categoryScore: number; intentScore: number; usageWeight: number
}

interface Stats {
  totalDocuments: number; documentsByCategory: Record<string, number>; totalRetrievals: number
  topAccessed: Array<{ id: string; slug: string; title: string; category: string; accessCount: number }>
  recentIngestions: Array<{
    id: string; operation: string; category: string | null
    documentsProcessed: number; status: string; startedAt: string; completedAt: string | null
  }>
}

interface ContextResult {
  context: string; documentsUsed: number; totalTokens: number
  sources: Array<{ slug: string; title: string; category: string; score: number }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function CatBadge({ category }: { category: string }) {
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${CAT_COLORS[category] || 'bg-gray-100 text-gray-800'}`}>{category}</Badge>
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
  return data
}

// Section toggle helper
function Section({ title, icon: Icon, items, color }: { title: string; icon: React.ElementType; items: string[]; color: string }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-medium w-full hover:bg-accent/50 rounded px-1 py-0.5 transition-colors">
        <Icon className={`h-3 w-3 ${color}`} /><span>{title}</span><span className="text-muted-foreground">({items.length})</span>
        {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {open && <ul className="mt-1 ml-5 space-y-0.5">{items.map((item, i) => <li key={i} className="text-[11px] text-muted-foreground leading-snug">&bull; {item}</li>)}</ul>}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tab, setTab] = useState<NavTab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [archOpen, setArchOpen] = useState(false)
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
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-white" />
              </div>
              {sidebarOpen && <div><div className="font-bold text-xs leading-tight">IndustryX</div><div className="text-[9px] text-muted-foreground">Knowledge MCP Provider</div></div>}
            </div>
          </div>
          <nav className="flex-1 p-1.5 space-y-0.5">
            {NAV.map(item => {
              const Icon = item.icon; const active = tab === item.id
              return (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-accent'} ${!sidebarOpen ? 'justify-center' : ''}`}>
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-emerald-500' : ''}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              )
            })}
            <div className="pt-1 mt-1 border-t border-border">
              <button onClick={() => setArchOpen(true)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-muted-foreground hover:bg-accent ${!sidebarOpen ? 'justify-center' : ''}`}>
                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                {sidebarOpen && <span>{ARCH_NAV.label}</span>}
              </button>
            </div>
          </nav>
          <div className="p-1.5 border-t border-border space-y-1">
            <Button variant="ghost" size={sidebarOpen ? 'default' : 'icon'} className="w-full h-7 text-xs" onClick={toggleTheme} suppressHydrationWarning>
              {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {sidebarOpen && <span className="ml-1">{resolvedTheme === 'dark' ? 'Light' : 'Dark'}</span>}
            </Button>
            <Button variant="ghost" size="icon" className="w-full h-7" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-2 p-2 border-b border-border bg-card sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileOpen(true)}><Menu className="h-4 w-4" /></Button>
          <Brain className="h-4 w-4 text-emerald-600" />
          <span className="font-bold text-xs">IndustryX MCP</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-56 p-0">
            <SheetHeader className="p-3 border-b"><SheetTitle className="text-sm">Navigation</SheetTitle></SheetHeader>
            <nav className="p-2 space-y-1">
              {NAV.map(item => {
                const Icon = item.icon
                return <button key={item.id} onClick={() => { setTab(item.id); setMobileOpen(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent">
                  <Icon className="h-3.5 w-3.5" /><span>{item.label}</span>
                </button>
              })}
              <div className="pt-1 mt-1 border-t border-border">
                <button onClick={() => { setArchOpen(true); setMobileOpen(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent">
                  <GitBranch className="h-3.5 w-3.5" /><span>{ARCH_NAV.label}</span>
                </button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Architecture Side Panel */}
        <Sheet open={archOpen} onOpenChange={setArchOpen}>
          <SheetContent side="right" className="w-full md:w-[640px] lg:w-[800px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-emerald-600" />Architecture Flow</SheetTitle>
              <p className="text-[10px] text-muted-foreground mt-1">IndustryX Knowledge MCP Server — Full 6-Layer Architecture</p>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)]">
              <div className="p-4">
                <img
                  src="/architecture-flow.png"
                  alt="IndustryX Knowledge MCP Server Architecture Flow Diagram"
                  className="w-full rounded-lg border border-border shadow-sm"
                />
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 border">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Layer 1</div>
                      <div className="text-muted-foreground">AI Agents — Claude Code, Cursor, Codex connect via SSE</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2.5 border">
                      <div className="font-bold text-blue-700 dark:text-blue-300 mb-1">Layer 2</div>
                      <div className="text-muted-foreground">MCP Protocol — JSON-RPC 2.0 over SSE transport</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-2.5 border">
                      <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">Layer 3</div>
                      <div className="text-muted-foreground">MCP Server — 8 tools exposed on port 3002</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2.5 border">
                      <div className="font-bold text-amber-700 dark:text-amber-300 mb-1">Layer 4</div>
                      <div className="text-muted-foreground">REST API — Next.js 16, 12 endpoints on port 3000</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-2.5 border">
                      <div className="font-bold text-purple-700 dark:text-purple-300 mb-1">Layer 5</div>
                      <div className="text-muted-foreground">Knowledge Engine — Hybrid search, context builder, embeddings</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5 border">
                      <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">Layer 6</div>
                      <div className="text-muted-foreground">Data Layer — SQLite + Prisma, 11 docs, 6 categories</div>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border text-[10px] text-muted-foreground">
                    <div className="font-semibold text-foreground mb-1">Example Flow</div>
                    Agent connects SSE → initialize → tools/list → tools/call <code className="bg-muted px-1 rounded">search_skills("cloud save")</code> →
                    POST /search → Hybrid Engine scores → SQLite query → returns ranked results → Agent calls <code className="bg-muted px-1 rounded">retrieve_knowledge("cloud-save")</code> → GET /knowledge/:id → full document with rules, steps, anti-patterns
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {tab === 'overview' && <OverviewTab />}
            {tab === 'knowledge' && <KnowledgeTab />}
            {tab === 'search' && <SearchTab />}
            {tab === 'ingest' && <IngestTab />}
            {tab === 'mcp' && <MCPToolsTab />}
          </div>
        </main>
      </div>

      <footer className="mt-auto border-t border-border bg-card px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground">
          <span>IndustryX Knowledge MCP Provider &copy; {new Date().getFullYear()}</span>
          <span className="flex items-center gap-1"><Server className="h-2.5 w-2.5" /> JSON-Native v1.0</span>
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

  const chartData = stats ? Object.entries(stats.documentsByCategory).map(([name, count]) => ({ name, count, fill: CAT_BAR[name] || '#6b7280' })).sort((a, b) => b.count - a.count) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Dashboard</h1><p className="text-muted-foreground text-xs">JSON-Native Knowledge System</p></div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}><RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Documents', value: stats?.totalDocuments ?? 0, icon: FileText, color: 'bg-emerald-500/10 text-emerald-600' },
          { title: 'Categories', value: stats ? Object.keys(stats.documentsByCategory).length : 0, icon: BarChart3, color: 'bg-teal-500/10 text-teal-600' },
          { title: 'Retrievals', value: stats?.totalRetrievals ?? 0, icon: Activity, color: 'bg-amber-500/10 text-amber-600' },
          { title: 'MCP Tools', value: 8, icon: Wrench, color: 'bg-cyan-500/10 text-cyan-600' },
        ].map(s=>(<Card key={s.title}><CardContent className="pt-4 pb-3 px-4"><div className="flex items-center justify-between">
          <div><p className="text-[10px] text-muted-foreground">{s.title}</p>{loading?<Skeleton className="h-6 w-10 mt-0.5"/>:<p className="text-lg font-bold">{s.value.toLocaleString()}</p>}</div>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="h-4 w-4"/></div>
        </div></CardContent></Card>))}
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
                      <div className="flex items-center gap-1.5 shrink-0"><CatBadge category={doc.category} /><Badge variant="secondary" className="text-[10px]">{doc.accessCount}</Badge></div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-teal-500" />Ingestion Logs</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div> : (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {stats?.recentIngestions.map(ing => (
                    <div key={ing.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent text-xs">
                      <div><div className="font-medium">{ing.operation}</div><div className="text-[10px] text-muted-foreground">{ing.category || 'All'} &middot; {fmtDate(ing.startedAt)}</div></div>
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

const EMPTY_DOC: Partial<KnowledgeDoc> = { title: '', slug: '', category: 'skills', description: '', tags: [], intents: [], dependencies: [], antiPatterns: [], implementationSteps: [], rules: [], examples: [], references: [], schemaVersion: '1.0.0' }

function KnowledgeTab() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [viewDoc, setViewDoc] = useState<KnowledgeDoc | null>(null)
  const [editDoc, setEditDoc] = useState<KnowledgeDoc | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<KnowledgeDoc | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState(EMPTY_DOC)
  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const cat = catFilter !== 'all' ? catFilter : ''
      const data = await apiFetch<{ documents: KnowledgeDoc[] }>(`/api/knowledge${cat ? `?category=${cat}` : ''}`)
      setDocs(data.documents)
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }, [catFilter])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openEdit = (doc: KnowledgeDoc) => {
    setEditDoc(doc); setIsNew(false)
    setForm({ ...doc })
  }

  const openNew = () => {
    setEditDoc({} as KnowledgeDoc); setIsNew(true)
    setForm({ ...EMPTY_DOC })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        slug: form.slug, title: form.title, category: form.category, description: form.description || '',
        tags: form.tags || [], intents: form.intents || [], dependencies: form.dependencies || [],
        antiPatterns: form.antiPatterns || [], implementationSteps: form.implementationSteps || [],
        rules: form.rules || [], examples: form.examples || [], references: form.references || [],
        schemaVersion: form.schemaVersion || '1.0.0',
      }
      if (isNew) {
        await apiFetch('/api/knowledge', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Created successfully')
      } else if (editDoc) {
        await apiFetch(`/api/knowledge/${editDoc.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Updated successfully')
      }
      setEditDoc(null); fetchDocs()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try { await fetch(`/api/knowledge/${deleteDoc.id}`, { method: 'DELETE' }); toast.success('Deleted'); fetchDocs() }
    catch { toast.error('Delete failed') }
    setDeleteDoc(null)
  }

  // Form helpers for array fields
  const setArrField = (field: keyof KnowledgeDoc, val: string, sep: 'comma' | 'line') => {
    const arr = sep === 'comma' ? val.split(',').map(s => s.trim()).filter(Boolean) : val.split('\n').map(s => s.trim()).filter(Boolean)
    setForm(prev => ({ ...prev, [field]: arr }))
  }

  const arrToStr = (arr: string[] | undefined, sep: 'comma' | 'line') => (arr || []).join(sep === 'comma' ? ', ' : '\n')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold">Knowledge Base</h1><p className="text-muted-foreground text-xs">{docs.length} JSON knowledge units</p></div>
        <div className="flex items-center gap-2">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew}><Plus className="h-3 w-3 mr-1" />New</Button>
          <Button variant="outline" size="sm" onClick={fetchDocs}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Title</TableHead><TableHead className="text-xs">Category</TableHead>
            <TableHead className="text-xs hidden md:table-cell">Tags</TableHead>
            <TableHead className="text-xs hidden lg:table-cell">Intents</TableHead>
            <TableHead className="text-xs hidden lg:table-cell">Rules</TableHead>
            <TableHead className="text-xs hidden sm:table-cell">Version</TableHead>
            <TableHead className="text-xs hidden sm:table-cell">Active</TableHead>
            <TableHead className="text-xs">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>{docs.map(doc => (
            <TableRow key={doc.id}>
              <TableCell className="text-xs"><div className="font-medium max-w-[160px] truncate">{doc.title}</div><div className="text-[10px] text-muted-foreground">{doc.slug}</div></TableCell>
              <TableCell><CatBadge category={doc.category} /></TableCell>
              <TableCell className="text-xs hidden md:table-cell"><div className="flex flex-wrap gap-0.5 max-w-[120px]">{(doc.tags||[]).slice(0,2).map((t,i)=><Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{t}</Badge>)}{(doc.tags||[]).length>2&&<span className="text-[9px] text-muted-foreground">+{doc.tags.length-2}</span>}</div></TableCell>
              <TableCell className="text-xs hidden lg:table-cell">{(doc.intents||[]).length}</TableCell>
              <TableCell className="text-xs hidden lg:table-cell">{(doc.rules||[]).length}</TableCell>
              <TableCell className="text-xs hidden sm:table-cell">v{doc.schemaVersion||doc.version}</TableCell>
              <TableCell className="hidden sm:table-cell">{doc.isActive?<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>:<X className="h-3.5 w-3.5 text-muted-foreground"/>}</TableCell>
              <TableCell><div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>setViewDoc(doc)}><Eye className="h-3 w-3"/></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>openEdit(doc)}><Pencil className="h-3 w-3"/></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>setDeleteDoc(doc)}><Trash2 className="h-3 w-3 text-destructive"/></Button>
              </div></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></div></CardContent></Card>
      )}

      {/* View Document */}
      <Sheet open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <SheetContent className="w-full md:w-[520px] overflow-y-auto">
          <SheetHeader><SheetTitle className="text-sm">{viewDoc?.title}</SheetTitle><SheetDescription className="text-xs">{viewDoc?.category} &middot; {viewDoc?.slug} &middot; v{viewDoc?.schemaVersion}</SheetDescription></SheetHeader>
          {viewDoc && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">{viewDoc.description}</p>
              {(viewDoc.tags || []).length > 0 && <div className="flex flex-wrap gap-1">{viewDoc.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>}
              <Separator />
              <Section title="Rules" icon={Shield} items={viewDoc.rules || []} color="text-emerald-500" />
              <Section title="Implementation Steps" icon={ListOrdered} items={viewDoc.implementationSteps || []} color="text-teal-500" />
              <Section title="Anti-Patterns" icon={AlertTriangle} items={viewDoc.antiPatterns || []} color="text-red-500" />
              <Section title="Dependencies" icon={Link2} items={viewDoc.dependencies || []} color="text-amber-500" />
              <Section title="Intents" icon={Target} items={viewDoc.intents || []} color="text-cyan-500" />
              <Section title="References" icon={BookOpen} items={viewDoc.references || []} color="text-purple-500" />
              {(viewDoc.examples||[]).length>0&&<div>
                <div className="flex items-center gap-1.5 text-xs font-medium"><Lightbulb className="h-3 w-3 text-amber-500"/>Examples ({viewDoc.examples.length})</div>
                <div className="mt-1 ml-5 space-y-1.5">{viewDoc.examples.map((ex,i)=><div key={i} className="bg-muted/40 rounded p-2"><div className="text-[11px] font-medium">{ex.name}</div><div className="text-[10px] text-muted-foreground">{ex.description}</div></div>)}</div>
              </div>}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create/Edit Dialog */}
      <Dialog open={!!editDoc} onOpenChange={() => setEditDoc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">{isNew ? 'Create' : 'Edit'} Knowledge Unit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Slug</Label><Input className="text-xs h-8 mt-1" value={form.slug||''} onChange={e=>setForm(p=>({...p,slug:e.target.value}))} placeholder="my-knowledge" disabled={!isNew}/></div>
              <div><Label className="text-xs">Category</Label><Select value={form.category||'skills'} onValueChange={v=>setForm(p=>({...p,category:v}))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue/></SelectTrigger><SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="text-xs">Title</Label><Input className="text-xs h-8 mt-1" value={form.title||''} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/></div>
            <div><Label className="text-xs">Description</Label><Textarea className="text-xs mt-1 min-h-[60px]" value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
            <div><Label className="text-xs">Tags (comma-separated)</Label><Input className="text-xs h-8 mt-1" value={arrToStr(form.tags,'comma')} onChange={e=>setArrField('tags',e.target.value,'comma')} placeholder="tag1, tag2"/></div>
            <div><Label className="text-xs">Intents (one per line)</Label><Textarea className="text-xs mt-1 min-h-[50px]" value={arrToStr(form.intents,'line')} onChange={e=>setArrField('intents',e.target.value,'line')}/></div>
            <div><Label className="text-xs">Dependencies (comma-separated)</Label><Input className="text-xs h-8 mt-1" value={arrToStr(form.dependencies,'comma')} onChange={e=>setArrField('dependencies',e.target.value,'comma')}/></div>
            <div><Label className="text-xs">Anti-Patterns (one per line)</Label><Textarea className="text-xs mt-1 min-h-[50px]" value={arrToStr(form.antiPatterns,'line')} onChange={e=>setArrField('antiPatterns',e.target.value,'line')}/></div>
            <div><Label className="text-xs">Impl Steps (one per line)</Label><Textarea className="text-xs mt-1 min-h-[50px]" value={arrToStr(form.implementationSteps,'line')} onChange={e=>setArrField('implementationSteps',e.target.value,'line')}/></div>
            <div><Label className="text-xs">Rules (one per line)</Label><Textarea className="text-xs mt-1 min-h-[50px]" value={arrToStr(form.rules,'line')} onChange={e=>setArrField('rules',e.target.value,'line')}/></div>
            <div><Label className="text-xs">References (comma-separated)</Label><Input className="text-xs h-8 mt-1" value={arrToStr(form.references,'comma')} onChange={e=>setArrField('references',e.target.value,'comma')}/></div>
            <div><Label className="text-xs">Schema Version</Label><Input className="text-xs h-8 mt-1 w-24" value={form.schemaVersion||'1.0.0'} onChange={e=>setForm(p=>({...p,schemaVersion:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={()=>setEditDoc(null)}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving}>{saving&&<Loader2 className="h-3 w-3 animate-spin mr-1"/>}{isNew?'Create':'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="text-sm">Delete &ldquo;{deleteDoc?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">This will soft-delete the document.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={handleDelete}>Delete</AlertDialogAction>
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
  const [ctxResult, setCtxResult] = useState<ContextResult | null>(null)
  const [similarId, setSimilarId] = useState('')
  const [similarResults, setSimilarResults] = useState<SearchResultItem[]>([])

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true); setCtxResult(null)
    try {
      const data = await apiFetch<{ results: SearchResultItem[] }>('/api/knowledge/search', {
        method: 'POST', body: JSON.stringify({ query, limit: 5 }),
      })
      setResults(data.results)
    } catch { toast.error('Search failed') }
    finally { setSearching(false) }
  }

  const doContext = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await apiFetch<ContextResult>('/api/knowledge/context', {
        method: 'POST', body: JSON.stringify({ query, maxDocuments: 5, maxTokenBudget: 5000 }),
      })
      setCtxResult(data)
    } catch { toast.error('Context build failed') }
    finally { setSearching(false) }
  }

  const doSimilar = async () => {
    if (!similarId.trim()) return
    setSearching(true)
    try {
      const data = await apiFetch<{ results: SearchResultItem[] }>(`/api/knowledge/similar?id=${similarId}&limit=5`)
      setSimilarResults(data.results)
    } catch { toast.error('Similar search failed') }
    finally { setSearching(false) }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Search & Retrieve</h1><p className="text-muted-foreground text-xs">Hybrid retrieval with score breakdown</p></div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search knowledge..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="text-xs h-8" />
            <Button size="sm" onClick={doSearch} disabled={searching}>{searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}Search</Button>
            <Button size="sm" variant="outline" onClick={doContext} disabled={searching}><Brain className="h-3 w-3 mr-1" />Context</Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Search Results</h3>
          {results.map(r => (
            <Card key={r.id} className="border-l-4" style={{ borderLeftColor: CAT_BAR[r.category] || '#6b7280' }}>
              <CardContent className="py-2.5 px-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-xs font-medium">{r.title}</div><div className="text-[10px] text-muted-foreground line-clamp-2">{r.description}</div></div>
                  <div className="flex items-center gap-1 shrink-0"><CatBadge category={r.category} /><Badge variant="secondary" className="text-[10px]">{r.score.toFixed(3)}</Badge></div>
                </div>
                {/* Score breakdown */}
                <div className="grid grid-cols-5 gap-1 text-[9px]">
                  {[{label:'Embed',val:r.embeddingScore,color:'bg-emerald-500'},{label:'Keyword',val:r.keywordScore,color:'bg-teal-500'},{label:'Category',val:r.categoryScore,color:'bg-amber-500'},{label:'Intent',val:r.intentScore,color:'bg-cyan-500'},{label:'Usage',val:r.usageWeight,color:'bg-slate-500'}].map(s=>(
                    <div key={s.label} className="text-center">
                      <div className="h-1 rounded-full bg-muted overflow-hidden mb-0.5"><div className={`h-full rounded-full ${s.color}`} style={{width:`${Math.min(s.val*100,100)}%`}}/></div>
                      <div className="text-muted-foreground">{s.label}</div><div className="font-medium">{s.val.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                {(r.tags || []).length > 0 && <div className="flex flex-wrap gap-0.5">{r.tags.slice(0, 4).map((t, i) => <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{t}</Badge>)}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ctxResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assembled Context</CardTitle>
            <CardDescription className="text-[10px]">{ctxResult.documentsUsed} docs &middot; ~{ctxResult.totalTokens} tokens</CardDescription>
          </CardHeader>
          <CardContent>
            {ctxResult.sources.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{ctxResult.sources.map((s, i) => <Badge key={i} variant="outline" className="text-[9px]">{s.title} ({s.score.toFixed(2)})</Badge>)}</div>}
            <ScrollArea className="h-64"><pre className="text-[10px] whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-lg">{ctxResult.context}</pre></ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Similar docs finder */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Find Similar Documents</CardTitle><CardDescription className="text-[10px]">Enter a document ID to find similar knowledge units</CardDescription></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Document ID..." value={similarId} onChange={e => setSimilarId(e.target.value)} className="text-xs h-8" />
            <Button size="sm" variant="outline" onClick={doSimilar} disabled={searching}>{searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}Find</Button>
          </div>
          {similarResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {similarResults.map(r => (
                <div key={r.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent text-xs">
                  <div className="min-w-0 flex-1"><div className="font-medium truncate">{r.title}</div><div className="text-[10px] text-muted-foreground">{r.category}</div></div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{r.score.toFixed(3)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
      setResult(data); toast.success(`Ingested ${data.totalProcessed} docs`)
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
      <div><h1 className="text-xl font-bold">Knowledge Ingestion</h1><p className="text-muted-foreground text-xs">Ingest JSON knowledge files and rebuild embeddings</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Full Reindex</CardTitle><CardDescription className="text-[10px]">Scan all JSON knowledge directories</CardDescription></CardHeader>
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
  const [tool, setTool] = useState(MCP_TOOLS[0])
  const [queryInput, setQueryInput] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [limitInput, setLimitInput] = useState('5')
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState('')

  const execute = async () => {
    setExecuting(true); setResult('')
    try {
      let body: Record<string, unknown>
      if (tool.name === 'retrieve_knowledge') {
        body = { slug: slugInput }
      } else {
        body = { query: queryInput, limit: parseInt(limitInput) || 5 }
        if (tool.name === 'build_context') body = { query: queryInput, maxDocuments: parseInt(limitInput) || 5, maxTokenBudget: 5000 }
        if (tool.name === 'search_skills') body = { ...body, category: 'skills' }
        if (tool.name === 'search_sops') body = { ...body, category: 'sops' }
        if (tool.name === 'search_architecture') body = { ...body, category: 'architecture' }
        if (tool.name === 'search_security') body = { ...body, category: 'security' }
        if (tool.name === 'search_game_system') body = { ...body, category: 'game-economy' }
      }

      let endpoint = '/api/knowledge/search'
      const method = 'POST'
      if (tool.name === 'retrieve_knowledge') endpoint = `/api/knowledge/${slugInput}`
      if (tool.name === 'build_context') endpoint = '/api/knowledge/context'

      const data = await apiFetch<unknown>(endpoint, {
        method: tool.name === 'retrieve_knowledge' ? 'GET' : 'POST',
        body: tool.name === 'retrieve_knowledge' ? undefined : JSON.stringify(body),
      })
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
              <Button key={t.name} variant={tool.name === t.name ? 'default' : 'outline'} size="sm" className="text-[10px] h-6"
                onClick={() => setTool(t)}>{t.name}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{tool.desc} &mdash; params: {tool.params.join(', ')}</p>

          {tool.name !== 'retrieve_knowledge' && (
            <div><Label className="text-xs">Query</Label><Input placeholder="Enter search query..." value={queryInput} onChange={e => setQueryInput(e.target.value)} className="text-xs h-8 mt-1" /></div>
          )}
          {tool.name === 'retrieve_knowledge' && (
            <div><Label className="text-xs">Slug</Label><Input placeholder="e.g., cloud-save" value={slugInput} onChange={e => setSlugInput(e.target.value)} className="text-xs h-8 mt-1" /></div>
          )}
          <div><Label className="text-xs">Limit</Label><Input type="number" value={limitInput} onChange={e => setLimitInput(e.target.value)} className="text-xs h-8 mt-1 w-20" /></div>

          <Button size="sm" onClick={execute} disabled={executing}>
            {executing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}Execute {tool.name}
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
