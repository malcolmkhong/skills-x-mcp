'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  FileText, Zap, Server, Brain, Plus, Key, Search,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import {
  type DashboardStats, type KnowledgeStats, type HealthStatus,
  apiFetch, formatNumber, CAT_COLORS, CAT_BAR_COLORS,
} from './types'

interface OverviewTabProps {
  onNavigate: (tab: string) => void
}

export default function OverviewTab({ onNavigate }: OverviewTabProps) {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null)
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [mcpHealth, setMcpHealth] = useState<{ status: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, kStats, appHealth] = await Promise.all([
        apiFetch<DashboardStats>('/api/analytics/dashboard').catch(() => null),
        apiFetch<KnowledgeStats>('/api/knowledge/stats').catch(() => null),
        apiFetch<HealthStatus>('/api/health').catch(() => null),
      ])
      setDashboard(dash)
      setKnowledgeStats(kStats)
      setHealth(appHealth)

      // Check MCP server health
      const mcpH = await fetch('/api/health?XTransformPort=3002')
        .then(r => r.json())
        .catch(() => null)
      setMcpHealth(mcpH)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const categoryChartData = knowledgeStats
    ? Object.entries(knowledgeStats.documentsByCategory).map(([cat, count]) => ({
        category: cat,
        count,
        fill: CAT_BAR_COLORS[cat] || '#6b7280',
      }))
    : []

  const systemStatuses = [
    {
      name: 'MCP Server',
      status: mcpHealth?.status === 'ok' ? 'healthy' : mcpHealth ? 'degraded' : 'unknown',
      icon: Server,
    },
    {
      name: 'Database',
      status: health?.database === 'connected' ? 'healthy' : health ? 'degraded' : 'unknown',
      icon: Activity,
    },
    {
      name: 'Embeddings',
      status: knowledgeStats && knowledgeStats.totalDocuments > 0 ? 'healthy' : 'unknown',
      icon: Brain,
    },
  ]

  const statCards = [
    {
      label: 'Total Documents',
      value: knowledgeStats?.totalDocuments ?? 0,
      icon: FileText,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'API Calls (30d)',
      value: dashboard?.totalApiCalls ?? 0,
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'MCP Calls (30d)',
      value: dashboard?.totalMcpCalls ?? 0,
      icon: Server,
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
    },
    {
      label: 'Tokens Saved (30d)',
      value: dashboard?.totalTokensSaved ?? 0,
      icon: Brain,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold">{formatNumber(card.value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge by Category Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Knowledge by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                No knowledge data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status + Quick Actions */}
        <div className="space-y-4">
          {/* System Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemStatuses.map(s => {
                const Icon = s.icon
                const statusColor = s.status === 'healthy'
                  ? 'text-emerald-500'
                  : s.status === 'degraded'
                  ? 'text-amber-500'
                  : 'text-gray-400'
                const StatusIcon = s.status === 'healthy' ? CheckCircle2
                  : s.status === 'degraded' ? AlertTriangle : XCircle
                return (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${statusColor}`} />
                      <span className="text-sm">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
                      <span className={`text-xs font-medium ${statusColor} capitalize`}>{s.status}</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between h-10"
                onClick={() => onNavigate('knowledge')}
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-600" />
                  Create Knowledge
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between h-10"
                onClick={() => onNavigate('keys')}
              >
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-600" />
                  Generate API Key
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between h-10"
                onClick={() => onNavigate('search')}
              >
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-sky-600" />
                  Search Knowledge
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity / Top Accessed */}
      {knowledgeStats && knowledgeStats.topAccessed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most Accessed Knowledge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {knowledgeStats.topAccessed.slice(0, 6).map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${CAT_COLORS[item.category] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {item.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.accessCount} accesses</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
