'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Copy, RotateCw, Ban, Eye, Key, Loader2,
  Shield, CheckCircle2, XCircle, Clock, Zap,
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  type ApiKeyResponse, type CreateApiKeyResult, type ApiKeyUsageStat,
  apiFetch, formatDate, formatDateTime, formatNumber,
} from './types'

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<CreateApiKeyResult | null>(null)
  const [revokeKey, setRevokeKey] = useState<ApiKeyResponse | null>(null)
  const [rotateKey, setRotateKey] = useState<ApiKeyResponse | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewUsage, setViewUsage] = useState<ApiKeyResponse | null>(null)
  const [usageStats, setUsageStats] = useState<ApiKeyUsageStat | null>(null)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form
  const [form, setForm] = useState({
    name: '', permissions: ['read'] as string[], rateLimit: 100, monthlyLimit: 10000, expiresAt: '',
  })

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ apiKeys: ApiKeyResponse[] }>('/api/keys')
      setKeys(data.apiKeys || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load API keys'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const result = await apiFetch<CreateApiKeyResult>('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          permissions: form.permissions,
          rateLimit: form.rateLimit,
          monthlyLimit: form.monthlyLimit,
          expiresAt: form.expiresAt || undefined,
        }),
      })
      setNewKeyResult(result)
      setCreateOpen(false)
      setForm({ name: '', permissions: ['read'], rateLimit: 100, monthlyLimit: 10000, expiresAt: '' })
      toast.success('API key created')
      loadKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeKey) return
    setSaving(true)
    try {
      await apiFetch(`/api/keys/${revokeKey.id}?reason=${encodeURIComponent(revokeReason || 'Revoked by user')}`, {
        method: 'DELETE',
      })
      toast.success('API key revoked')
      setRevokeKey(null)
      setRevokeReason('')
      loadKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke')
    } finally {
      setSaving(false)
    }
  }

  const handleRotate = async () => {
    if (!rotateKey) return
    setSaving(true)
    try {
      const result = await apiFetch<CreateApiKeyResult>(`/api/keys/${rotateKey.id}/rotate`, {
        method: 'POST',
      })
      setNewKeyResult(result)
      setRotateKey(null)
      toast.success('API key rotated — save the new key!')
      loadKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate')
    } finally {
      setSaving(false)
    }
  }

  const handleViewUsage = async (key: ApiKeyResponse) => {
    setViewUsage(key)
    setUsageError(null)
    setUsageStats(null)
    try {
      const data = await apiFetch<ApiKeyUsageStat>(`/api/keys/${key.id}/usage?days=30`)
      setUsageStats(data)
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : 'Failed to load usage data')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const getKeyStatus = (key: ApiKeyResponse) => {
    if (key.isRevoked) return { label: 'Revoked', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', icon: XCircle }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { label: 'Expired', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: Clock }
    return { label: 'Active', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 }
  }

  const handleRetry = () => {
    setError(null)
    loadKeys()
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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">{keys.filter(k => !k.isRevoked).length} active keys</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> Create Key
        </Button>
      </div>

      {/* Key List */}
      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No API keys yet. Create one to get started.</p>
          </div>
        ) : keys.map(key => {
          const status = getKeyStatus(key)
          const StatusIcon = status.icon
          const usagePercent = key.monthlyLimit > 0 ? (key.monthlyUsage / key.monthlyLimit) * 100 : 0

          return (
            <Card key={key.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium">{key.name}</h3>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" /> {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {key.permissions.join(', ')}</span>
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {key.rateLimit}/min</span>
                      <span>Last used: {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'Never'}</span>
                    </div>

                    {/* Usage Bar */}
                    {key.monthlyLimit > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>Monthly Usage</span>
                          <span>{formatNumber(key.monthlyUsage)} / {formatNumber(key.monthlyLimit)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {key.expiresAt && (
                      <p className="text-[10px] text-muted-foreground mt-1">Expires: {formatDate(key.expiresAt)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewUsage(key)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {!key.isRevoked && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRotateKey(key)}>
                          <RotateCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setRevokeKey(key)}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* MCP Connection Snippet */}
      <Card className="border-emerald-200 dark:border-emerald-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4 text-emerald-600" />
            MCP Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Use your API key to connect MCP clients:</p>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1">
            <p className="text-muted-foreground"># Claude Code / Cursor configuration</p>
            <p>{`{`}</p>
            <p className="ml-2">&quot;mcpServers&quot;: {'{'}</p>
            <p className="ml-4">&quot;industryx&quot;: {'{'}</p>
            <p className="ml-6">&quot;url&quot;: &quot;http://localhost:3002/sse?apiKey=ixk_YOUR_KEY_HERE&quot;</p>
            <p className="ml-4">{'}'}</p>
            <p className="ml-2">{'}'}</p>
            <p>{'}'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Production Key" />
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <Select value={form.permissions[0]} onValueChange={v => setForm({ ...form, permissions: [v] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Read + Write</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rate Limit (req/min)</Label>
                <Input type="number" value={form.rateLimit} onChange={e => setForm({ ...form, rateLimit: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Limit</Label>
                <Input type="number" value={form.monthlyLimit} onChange={e => setForm({ ...form, monthlyLimit: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expires At (optional)</Label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={!!newKeyResult} onOpenChange={(open) => { if (!open) setNewKeyResult(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Save Your API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is the <strong>only time</strong> you&apos;ll see the full API key. Store it securely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-muted p-3 rounded-lg break-all">{newKeyResult?.rawKey}</code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKeyResult?.rawKey ?? '')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyResult(null)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              I&apos;ve Saved the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!revokeKey} onOpenChange={(open) => { if (!open) setRevokeKey(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to revoke &ldquo;{revokeKey?.name}&rdquo;? This action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input value={revokeReason} onChange={e => setRevokeReason(e.target.value)} placeholder="e.g., Security concern" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeKey(null)}>Cancel</Button>
            <Button onClick={handleRevoke} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Dialog */}
      <Dialog open={!!rotateKey} onOpenChange={(open) => { if (!open) setRotateKey(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rotate API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Rotating &ldquo;{rotateKey?.name}&rdquo; will revoke the current key and create a new one with the same settings.
            </p>
            <p className="text-sm text-amber-600 font-medium">The old key will stop working immediately.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateKey(null)}>Cancel</Button>
            <Button onClick={handleRotate} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Rotate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={!!viewUsage} onOpenChange={(open) => { if (!open) { setViewUsage(null); setUsageStats(null); setUsageError(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Key Usage: {viewUsage?.name}</DialogTitle>
          </DialogHeader>
          {usageError ? (
            <div className="text-center py-6 text-red-500 text-sm">{usageError}</div>
          ) : usageStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold">{formatNumber(usageStats.summary.totalCalls)}</p>
                  <p className="text-[10px] text-muted-foreground">Total Calls</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <p className="text-xl font-bold text-emerald-600">{formatNumber(usageStats.summary.successCalls)}</p>
                  <p className="text-[10px] text-muted-foreground">Success</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <p className="text-xl font-bold text-red-600">{formatNumber(usageStats.summary.errorCalls)}</p>
                  <p className="text-[10px] text-muted-foreground">Errors</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm">Success Rate: <span className="font-bold text-emerald-600">{(usageStats.summary.successRate * 100).toFixed(1)}%</span></p>
              </div>
              {usageStats.dailyStats.length > 0 && (
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Date</th>
                        <th className="text-right py-1">Total</th>
                        <th className="text-right py-1">Success</th>
                        <th className="text-right py-1">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageStats.dailyStats.slice(-14).map(d => (
                        <tr key={d.date} className="border-b border-border/30">
                          <td className="py-1">{d.date}</td>
                          <td className="text-right">{d.totalCalls}</td>
                          <td className="text-right text-emerald-600">{d.successCalls}</td>
                          <td className="text-right text-red-500">{d.errorCalls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading usage data...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
