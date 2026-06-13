'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Server, CheckCircle2, XCircle, AlertTriangle, Copy,
  Terminal, Code2, MonitorSmartphone, Webhook, Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type HealthStatus, apiFetch } from './types'

interface MCPToolInfo {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, { type: string; description: string; default?: unknown }>
    required?: string[]
  }
}

const MCP_TOOLS: MCPToolInfo[] = [
  {
    name: 'search_knowledge',
    description: 'Search the IndustryX knowledge base using hybrid retrieval (semantic similarity + keyword matching + intent matching + category boosting).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
        category: { type: 'string', description: 'Optional category filter' },
      },
      required: ['query'],
    },
  },
  {
    name: 'retrieve_knowledge',
    description: 'Retrieve a specific knowledge unit by its slug identifier.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'The knowledge unit slug' } },
      required: ['slug'],
    },
  },
  {
    name: 'build_context',
    description: 'Build an optimized AI context from knowledge base for a given query, with token budget management.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The query to build context for' },
        maxDocuments: { type: 'number', description: 'Max documents to include', default: 5 },
        maxTokenBudget: { type: 'number', description: 'Max token budget', default: 4000 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_skills',
    description: 'Search knowledge in the skills category.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_sops',
    description: 'Search knowledge in the SOPs category.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_architecture',
    description: 'Search knowledge in the architecture category.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_security',
    description: 'Search knowledge in the security category.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_game_system',
    description: 'Search knowledge across game system categories (economy, trading, marketplace, monetization, premium, anti-cheat).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results', default: 5 },
      },
      required: ['query'],
    },
  },
]

export default function McpTab() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [mcpHealth, setMcpHealth] = useState<{ status: string; version?: string; authenticatedConnections?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [connTab, setConnTab] = useState('claude-code')
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [appHealth, mcpH] = await Promise.all([
        apiFetch<HealthStatus>('/api/health').catch(() => null),
        fetch('/api/health?XTransformPort=3002').then(r => r.json()).catch(() => null),
      ])
      setHealth(appHealth ?? null)
      setMcpHealth(mcpH ?? null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to check server status'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const sseUrl = typeof window !== 'undefined' ? `${window.location.origin}/sse?XTransformPort=3002` : '/sse?XTransformPort=3002'

  const connectionConfigs: Record<string, { label: string; icon: React.ElementType; config: string }> = {
    'claude-code': {
      label: 'Claude Code',
      icon: Terminal,
      config: JSON.stringify({
        mcpServers: {
          industryx: {
            url: `${sseUrl}`,
          },
        },
      }, null, 2),
    },
    cursor: {
      label: 'Cursor',
      icon: MonitorSmartphone,
      config: JSON.stringify({
        mcpServers: {
          industryx: {
            url: `${sseUrl}`,
            transport: 'sse',
          },
        },
      }, null, 2),
    },
    vscode: {
      label: 'VS Code (GitHub Copilot)',
      icon: Code2,
      config: JSON.stringify({
        'mcp.servers': {
          industryx: {
            url: `${sseUrl}`,
          },
        },
      }, null, 2),
    },
    generic: {
      label: 'Generic MCP Client',
      icon: Webhook,
      config: `# SSE Endpoint\n${sseUrl}\n\n# With API Key Authentication\n${sseUrl}&apiKey=ixk_YOUR_KEY_HERE\n\n# HTTP Headers\nAuthorization: Bearer ixk_YOUR_KEY_HERE`,
    },
  }

  const handleRetry = () => {
    setError(null)
    loadData()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    )
  }

  const serverHealthy = mcpHealth?.status === 'ok'
  const dbHealthy = health?.database === 'connected'

  return (
    <div className="space-y-6 p-6">
      {/* Server Status */}
      <Card className={serverHealthy ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-amber-200 dark:border-amber-800/50'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${serverHealthy ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                <Server className={`h-5 w-5 ${serverHealthy ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">MCP Server</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {serverHealthy ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className={`text-xs font-medium ${serverHealthy ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {serverHealthy ? 'Healthy' : 'Degraded'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>Database:</span>
                {dbHealthy ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                <span>{dbHealthy ? 'Connected' : 'Disconnected'}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">v1.1.0</Badge>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadData}>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connection Info</CardTitle>
            <CardDescription className="text-xs">SSE endpoint for MCP client connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">SSE Endpoint</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-muted p-2 rounded-lg break-all">{sseUrl}</code>
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(sseUrl)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Rate Limits</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm font-bold">60/min</p>
                  <p className="text-[10px] text-muted-foreground">Authenticated</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm font-bold">10/min</p>
                  <p className="text-[10px] text-muted-foreground">Unauthenticated</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Active Connections</p>
              <p className="text-2xl font-bold text-emerald-600">{mcpHealth?.authenticatedConnections ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Connection Instructions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How to Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={connTab} onValueChange={setConnTab}>
              <TabsList className="grid grid-cols-4 h-8">
                {Object.entries(connectionConfigs).map(([key, val]) => {
                  const Icon = val.icon
                  return (
                    <TabsTrigger key={key} value={key} className="text-xs gap-1">
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{val.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {Object.entries(connectionConfigs).map(([key, val]) => (
                <TabsContent key={key} value={key} className="mt-3">
                  <div className="relative">
                    <pre className="bg-muted/80 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-52 custom-scrollbar">
                      {val.config}
                    </pre>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => copyToClipboard(val.config)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Tools List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4 text-emerald-600" />
            Available Tools ({MCP_TOOLS.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MCP_TOOLS.map(tool => (
              <div key={tool.name} className="p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-medium text-emerald-600">{tool.name}</code>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {tool.inputSchema.required?.length ?? 0} required
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                <div className="space-y-1">
                  {Object.entries(tool.inputSchema.properties).map(([param, schema]) => (
                    <div key={param} className="flex items-center gap-1.5 text-[10px]">
                      <code className="font-mono text-foreground">{param}</code>
                      <span className="text-muted-foreground">{schema.type}</span>
                      {tool.inputSchema.required?.includes(param) && <Badge className="text-[9px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">required</Badge>}
                      {schema.default !== undefined && <span className="text-muted-foreground">default: {String(schema.default)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
