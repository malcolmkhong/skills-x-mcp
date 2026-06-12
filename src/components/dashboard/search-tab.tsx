'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  Search, Sliders, Brain, FileText, Loader2, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  type SearchResultItem, type ContextResult,
  apiFetch, truncate, CAT_COLORS, CATEGORIES,
} from './types'

interface SearchHistoryItem {
  query: string
  timestamp: Date
  resultCount: number
}

export default function SearchTab() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [contextResult, setContextResult] = useState<ContextResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [tokenBudget, setTokenBudget] = useState([4000])
  const [maxDocs, setMaxDocs] = useState(5)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ query, limit: '10' })
      if (category !== 'all') params.set('category', category)
      const data = await apiFetch<{ results: SearchResultItem[] }>(`/api/knowledge/search?${params}`)
      setResults(data.results || [])
      setHistory(prev => [{ query, timestamp: new Date(), resultCount: data.results?.length ?? 0 }, ...prev.slice(0, 19)])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleBuildContext = async () => {
    if (!query.trim()) return
    setContextLoading(true)
    try {
      const data = await apiFetch<ContextResult>('/api/knowledge/context', {
        method: 'POST',
        body: JSON.stringify({
          query,
          maxDocuments: maxDocs,
          maxTokenBudget: tokenBudget[0],
        }),
      })
      setContextResult(data)
      toast.success(`Context built: ${data.documentsUsed} documents, ${data.totalTokens} tokens`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Context build failed')
    } finally {
      setContextLoading(false)
    }
  }

  const scoreColors: Record<string, string> = {
    embeddingScore: 'text-emerald-500',
    keywordScore: 'text-sky-500',
    categoryScore: 'text-amber-500',
    intentScore: 'text-violet-500',
    usageWeight: 'text-rose-500',
  }

  return (
    <div className="space-y-6 p-6">
      {/* Search Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-600" />
            Semantic Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for knowledge..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Results */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Search Results
            {results.length > 0 && <Badge variant="secondary" className="text-[10px]">{results.length}</Badge>}
          </h3>

          {results.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Enter a query to search knowledge</p>
            </div>
          )}

          <div className="max-h-[calc(100vh-400px)] overflow-y-auto space-y-2 custom-scrollbar">
            {results.map(r => (
              <Card key={r.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div
                    className="flex items-start justify-between gap-2 cursor-pointer"
                    onClick={() => setExpandedResult(expandedResult === r.id ? null : r.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-medium">{r.title}</h4>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CAT_COLORS[r.category] || ''}`}>
                          {r.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{truncate(r.description, 100)}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs font-medium text-emerald-600">Score: {(r.score * 100).toFixed(1)}%</span>
                        {expandedResult === r.id ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {expandedResult === r.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Score Breakdown</p>
                      {[
                        { key: 'embeddingScore', label: 'Embedding', value: r.embeddingScore },
                        { key: 'keywordScore', label: 'Keyword', value: r.keywordScore },
                        { key: 'categoryScore', label: 'Category', value: r.categoryScore },
                        { key: 'intentScore', label: 'Intent', value: r.intentScore },
                        { key: 'usageWeight', label: 'Usage', value: r.usageWeight },
                      ].map(s => (
                        <div key={s.key} className="flex items-center gap-2">
                          <span className={`text-xs w-16 ${scoreColors[s.key]}`}>{s.label}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.key === 'embeddingScore' ? 'bg-emerald-500' : s.key === 'keywordScore' ? 'bg-sky-500' : s.key === 'categoryScore' ? 'bg-amber-500' : s.key === 'intentScore' ? 'bg-violet-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(s.value * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{(s.value * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                      {r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Context Builder */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-600" />
                Context Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Token Budget</Label>
                  <span className="text-sm font-mono text-emerald-600">{tokenBudget[0].toLocaleString()}</span>
                </div>
                <Slider value={tokenBudget} onValueChange={setTokenBudget} min={500} max={16000} step={500} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Max Documents</Label>
                <Select value={String(maxDocs)} onValueChange={v => setMaxDocs(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleBuildContext}
                disabled={contextLoading || !query.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {contextLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Brain className="h-4 w-4 mr-1.5" />}
                Build Context
              </Button>

              {contextResult && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <p className="text-lg font-bold text-emerald-600">{contextResult.documentsUsed}</p>
                      <p className="text-[10px] text-muted-foreground">Documents</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30">
                      <p className="text-lg font-bold text-violet-600">{contextResult.totalTokens.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Tokens</p>
                    </div>
                  </div>

                  {contextResult.sources.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                      <div className="space-y-1">
                        {contextResult.sources.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${CAT_COLORS[s.category] || ''}`}>
                              {s.category}
                            </Badge>
                            <span className="truncate flex-1">{s.title}</span>
                            <span className="text-muted-foreground">{(s.score * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Context Preview</p>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 rounded-lg bg-muted/50 border text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {contextResult.context.slice(0, 1500)}{contextResult.context.length > 1500 ? '...' : ''}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search History */}
          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Search History</CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setHistory([])}>Clear</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/50 text-xs transition-colors"
                      onClick={() => { setQuery(h.query); }}
                    >
                      <span className="truncate">{h.query}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{h.resultCount} results</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
