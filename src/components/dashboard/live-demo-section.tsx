'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, Zap, Database, BarChart3, Tag,
  ChevronRight, Sparkles, AlertCircle, Layers,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResultItem {
  id: string
  slug: string
  title: string
  category: string
  description: string
  tags: string[]
  intents: string[]
  score: number
}

interface KnowledgeStatsResponse {
  totalDocuments: number
  documentsByCategory: Record<string, number>
  totalRetrievals: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_QUERIES = [
  'How to design accessible UI',
  'React best practices',
  'Security authentication patterns',
  'API rate limiting',
  'Deployment CI/CD pipeline',
  'Error handling strategies',
]

const CATEGORY_COLORS: Record<string, string> = {
  skills: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  sops: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  architecture: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
  security: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  economy: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  deployment: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300',
  'ui-standards': 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300',
  'backend-standards': 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  'frontend-standards': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300',
  'game-economy': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  trading: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
  marketplace: 'bg-lime-100 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300',
  'anti-cheat': 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  analytics: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  liveops: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  premium: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  monetization: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  'cloud-save': 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  'offline-sync': 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

// ─── Score Bar Component ─────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 70
      ? 'bg-emerald-500'
      : pct >= 40
        ? 'bg-amber-500'
        : 'bg-gray-400 dark:bg-gray-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  )
}

// ─── Result Card Component ───────────────────────────────────────────────────

function ResultCard({
  result,
  index,
}: {
  result: SearchResultItem
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className="group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 hover:shadow-md hover:shadow-emerald-500/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 border-0 font-medium ${getCategoryColor(result.category)}`}
                >
                  {result.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {result.slug}
                </span>
              </div>
              <h4 className="font-semibold text-sm sm:text-base mb-1.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors truncate">
                {result.title}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {result.description}
              </p>
              {result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {result.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                      {tag}
                    </span>
                  ))}
                  {result.tags.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{result.tags.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 w-20 sm:w-24 pt-1">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                Relevance
              </p>
              <ScoreBar score={result.score} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-5/6 rounded" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>
              <div className="w-20 sm:w-24 space-y-1.5 pt-1">
                <Skeleton className="h-3 w-14 rounded" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LiveDemoSection() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [stats, setStats] = useState<KnowledgeStatsResponse | null>(null)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/knowledge/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // Silently fail — stats are decorative
      }
    }
    fetchStats()
  }, [])

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 6 }),
      })

      if (!res.ok) {
        throw new Error('Search failed. Please try again.')
      }

      const data = await res.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced input handler
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        performSearch(value)
      }, 300)
    },
    [performSearch],
  )

  // Click query chip
  const handleChipClick = useCallback(
    (chip: string) => {
      setQuery(chip)
      performSearch(chip)
    },
    [performSearch],
  )

  // Submit handler
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      performSearch(query)
    },
    [query, performSearch],
  )

  const totalCategories = stats?.documentsByCategory
    ? Object.keys(stats.documentsByCategory).length
    : 0

  return (
    <section
      id="live-demo"
      aria-labelledby="live-demo-heading"
      className="py-20 md:py-24 bg-card/50 border-y border-border"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <Badge
            variant="outline"
            className="mb-3 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
          >
            <Zap className="h-3 w-3 mr-1.5" aria-hidden="true" />
            Try It Live
          </Badge>
          <h2
            id="live-demo-heading"
            className="text-3xl sm:text-4xl font-bold"
          >
            Search Knowledge in{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              Real-Time
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Type a query or click a suggestion below. No login required —
            see the semantic search in action.
          </p>
        </div>

        {/* ─── Search Input ───────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="relative mb-5"
          role="search"
          aria-label="Search knowledge base"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search knowledge units..."
                className="h-12 pl-11 pr-4 text-base rounded-xl border-border/80 bg-background shadow-sm focus-visible:border-emerald-400 focus-visible:ring-emerald-400/25"
                aria-label="Search knowledge"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4.5 w-4.5" aria-hidden="true" />
              )}
              <span className="ml-1.5 hidden sm:inline">Search</span>
            </Button>
          </div>
        </form>

        {/* ─── Query Chips ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Suggested queries">
          {SUGGESTED_QUERIES.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-border/70 bg-background hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 cursor-pointer"
            >
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              {chip}
            </button>
          ))}
        </div>

        {/* ─── Results Area ───────────────────────────────────────────── */}
        <div className="min-h-[200px]" aria-live="polite" aria-atomic="true">
          {/* Loading */}
          {isLoading && <ResultsSkeleton />}

          {/* Error */}
          {!isLoading && error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
                <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                Search Failed
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {error}
              </p>
            </motion.div>
          )}

          {/* No results */}
          {!isLoading && !error && hasSearched && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium mb-1">No results found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Try a different search term or click one of the suggestions above.
              </p>
            </motion.div>
          )}

          {/* Results */}
          {!isLoading && !error && results.length > 0 && (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {results.map((result, i) => (
                  <ResultCard key={result.id} result={result} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty initial state */}
          {!isLoading && !hasSearched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium mb-1">
                Start searching to see results
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Enter a query above or click a suggestion to try the semantic search.
              </p>
            </motion.div>
          )}
        </div>

        {/* ─── Stats Bar ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 pt-6 border-t border-border/60"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-foreground tabular-nums">
                  {stats?.totalDocuments?.toLocaleString() ?? '—'}
                </strong>{' '}
                Knowledge Units
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
              <span>
                <strong className="text-foreground tabular-nums">
                  {totalCategories || '—'}
                </strong>{' '}
                Categories
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>
                <strong className="text-foreground tabular-nums">
                  {stats?.totalRetrievals?.toLocaleString() ?? '—'}
                </strong>{' '}
                Retrievals
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>
                <strong className="text-foreground">&lt;100ms</strong> Avg. Latency
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
