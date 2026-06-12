'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  type DashboardStats, type MCPStats, type KnowledgeAnalytics,
  type TokenSavingsAnalytics, type UsageEvent,
  apiFetch, formatNumber, CAT_BAR_COLORS,
} from './types'

const COLORS = ['#10b981', '#f59e0b', '#14b8a6', '#ef4444', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899', '#0ea5e9', '#d946ef']

export default function AnalyticsTab() {
  const [activeSubTab, setActiveSubTab] = useState('overview')
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null)
  const [mcpStats, setMcpStats] = useState<MCPStats | null>(null)
  const [knowledgeAnalytics, setKnowledgeAnalytics] = useState<KnowledgeAnalytics | null>(null)
  const [tokenSavings, setTokenSavings] = useState<TokenSavingsAnalytics | null>(null)
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, mcp, knowledge, tokens, usage] = await Promise.all([
        apiFetch<DashboardStats>('/api/analytics/dashboard').catch(() => null),
        apiFetch<MCPStats>('/api/analytics/mcp?days=30').catch(() => null),
        apiFetch<KnowledgeAnalytics>('/api/analytics/knowledge').catch(() => null),
        apiFetch<TokenSavingsAnalytics>('/api/analytics/tokens?days=30').catch(() => null),
        apiFetch<{ events: UsageEvent[] }>('/api/analytics/usage?days=30').catch(() => ({ events: [] })),
      ])
      setDashboard(dash)
      setMcpStats(mcp)
      setKnowledgeAnalytics(knowledge)
      setTokenSavings(tokens)
      setUsageEvents((usage as { events: UsageEvent[] }).events || [])
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="mcp" className="text-xs">MCP</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs">Knowledge</TabsTrigger>
          <TabsTrigger value="usage" className="text-xs">Usage</TabsTrigger>
          <TabsTrigger value="tokens" className="text-xs">Tokens</TabsTrigger>
        </TabsList>

        {/* Overview Sub-Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'API Calls (30d)', value: dashboard?.totalApiCalls ?? 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
              { label: 'MCP Calls (30d)', value: dashboard?.totalMcpCalls ?? 0, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
              { label: 'Tokens Saved', value: dashboard?.totalTokensSaved ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Avg Response', value: `${dashboard?.avgResponseTime ?? 0}ms`, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
            ].map(card => (
              <Card key={card.label}>
                <CardContent className={`p-4 ${card.bg} rounded-xl`}>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Usage (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard && dashboard.usageByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboard.usageByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="apiCalls" stroke="#f59e0b" strokeWidth={2} name="API Calls" dot={false} />
                    <Line type="monotone" dataKey="mcpCalls" stroke="#0ea5e9" strokeWidth={2} name="MCP Calls" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No usage data yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP Sub-Tab */}
        <TabsContent value="mcp" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tool Usage Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-emerald-600" />
                  Tool Usage Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mcpStats && mcpStats.callsByTool.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={mcpStats.callsByTool} dataKey="count" nameKey="toolName" cx="50%" cy="50%" outerRadius={90} label={({ toolName, percent }: { toolName: string; percent: number }) => `${toolName} ${(percent * 100).toFixed(0)}%`}>
                        {mcpStats.callsByTool.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No MCP data</div>
                )}
              </CardContent>
            </Card>

            {/* Calls by Day */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-600" />
                  MCP Calls by Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mcpStats && mcpStats.callsByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={mcpStats.callsByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
                      <Bar dataKey="calls" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No MCP data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Average Response Time */}
          {mcpStats && mcpStats.avgScores.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tool Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mcpStats.avgScores.map(t => (
                    <div key={t.toolName} className="p-3 rounded-lg border border-border/50">
                      <p className="text-sm font-medium">{t.toolName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Avg: {t.avgDurationMs.toFixed(0)}ms</span>
                        <span>Success: {(t.successRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Knowledge Sub-Tab */}
        <TabsContent value="knowledge" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {knowledgeAnalytics && knowledgeAnalytics.categoryDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={knowledgeAnalytics.categoryDistribution} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }: { category: string; percent: number }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                        {knowledgeAnalytics.categoryDistribution.map((entry, i) => (
                          <Cell key={i} fill={CAT_BAR_COLORS[entry.category] || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                )}
              </CardContent>
            </Card>

            {/* Most Accessed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Most Accessed</CardTitle>
              </CardHeader>
              <CardContent>
                {knowledgeAnalytics && knowledgeAnalytics.mostAccessed.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={knowledgeAnalytics.mostAccessed.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
                      <Bar dataKey="accessCount" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Retrieval Trends */}
          {knowledgeAnalytics && knowledgeAnalytics.retrievalTrends.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Retrieval Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={knowledgeAnalytics.retrievalTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
                    <Line type="monotone" dataKey="retrievals" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage Sub-Tab */}
        <TabsContent value="usage" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Usage Events (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageEvents.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Date</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Tool</th>
                        <th className="text-right py-2 px-2">Duration</th>
                        <th className="text-right py-2 px-2">Tokens</th>
                        <th className="text-center py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageEvents.map(e => (
                        <tr key={e.id} className="border-b border-border/30 hover:bg-accent/30">
                          <td className="py-1.5 px-2 text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</td>
                          <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px] px-1.5 py-0">{e.eventType}</Badge></td>
                          <td className="py-1.5 px-2">{e.toolName || '-'}</td>
                          <td className="py-1.5 px-2 text-right">{e.durationMs}ms</td>
                          <td className="py-1.5 px-2 text-right">{e.tokensUsed}</td>
                          <td className="py-1.5 px-2 text-center">
                            {e.success ? <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">OK</Badge>
                              : <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Err</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">No usage events recorded yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tokens Sub-Tab */}
        <TabsContent value="tokens" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Total Tokens Saved</p>
                <p className="text-2xl font-bold text-emerald-600">{formatNumber(tokenSavings?.totalTokensSaved ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Total Tokens Used</p>
                <p className="text-2xl font-bold text-sky-600">{formatNumber(tokenSavings?.totalTokensUsed ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className="text-2xl font-bold text-violet-600">{tokenSavings?.comparison.savingsPercent.toFixed(1) ?? 0}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Savings by Day */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Token Savings by Day</CardTitle>
            </CardHeader>
            <CardContent>
              {tokenSavings && tokenSavings.savingsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={tokenSavings.savingsByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
                    <Legend />
                    <Area type="monotone" dataKey="tokensSaved" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Saved" />
                    <Area type="monotone" dataKey="tokensUsed" stackId="2" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} name="Used" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No token data yet</div>
              )}
            </CardContent>
          </Card>

          {/* Comparison */}
          {tokenSavings && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Full Context vs Retrieved Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-6 justify-center py-4">
                  <div className="text-center">
                    <div className="w-32 bg-red-100 dark:bg-red-950/30 rounded-t-lg mx-auto transition-all" style={{ height: `${Math.max((tokenSavings.comparison.fullContextTokens / Math.max(tokenSavings.comparison.fullContextTokens, 1)) * 150, 20)}px` }} />
                    <p className="text-sm font-medium mt-2">Full Context</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(tokenSavings.comparison.fullContextTokens)} tokens</p>
                  </div>
                  <div className="text-center">
                    <div className="w-32 bg-emerald-100 dark:bg-emerald-950/30 rounded-t-lg mx-auto transition-all" style={{ height: `${Math.max((tokenSavings.comparison.retrievedContextTokens / Math.max(tokenSavings.comparison.fullContextTokens, 1)) * 150, 20)}px` }} />
                    <p className="text-sm font-medium mt-2">Retrieved</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(tokenSavings.comparison.retrievedContextTokens)} tokens</p>
                  </div>
                </div>
                <p className="text-center text-sm text-emerald-600 font-medium">
                  {tokenSavings.comparison.savingsPercent.toFixed(1)}% savings
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
