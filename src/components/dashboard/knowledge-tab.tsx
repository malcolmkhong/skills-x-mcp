'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Eye, RefreshCw, Upload, Search,
  X, ChevronDown, ChevronUp, ListOrdered, BookOpen, Lightbulb,
  Shield, Link2, Loader2, FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  type KnowledgeDoc, type KnowledgeStats,
  apiFetch, formatDate, truncate, CAT_COLORS, CATEGORIES,
} from './types'

export default function KnowledgeTab() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<KnowledgeDoc | null>(null)
  const [viewDoc, setViewDoc] = useState<KnowledgeDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<KnowledgeDoc | null>(null)
  const [similarDoc, setSimilarDoc] = useState<KnowledgeDoc | null>(null)
  const [similarResults, setSimilarResults] = useState<KnowledgeDoc[]>([])

  // Form state
  const [form, setForm] = useState({
    title: '', category: 'skills', description: '',
    tags: '', intents: '', dependencies: '', antiPatterns: '',
    implementationSteps: '', rules: '', examples: '', references: '',
  })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [docsData, statsData] = await Promise.all([
        apiFetch<{ documents: KnowledgeDoc[] }>('/api/knowledge'),
        apiFetch<KnowledgeStats>('/api/knowledge/stats'),
      ])
      setDocs(docsData.documents || [])
      setStats(statsData)
    } catch {
      toast.error('Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.description.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false
    if (statusFilter === 'active' && !d.isActive) return false
    if (statusFilter === 'inactive' && d.isActive) return false
    return true
  })

  const resetForm = () => {
    setForm({
      title: '', category: 'skills', description: '',
      tags: '', intents: '', dependencies: '', antiPatterns: '',
      implementationSteps: '', rules: '', examples: '', references: '',
    })
  }

  const openCreate = () => { resetForm(); setCreateOpen(true) }

  const openEdit = (doc: KnowledgeDoc) => {
    setForm({
      title: doc.title, category: doc.category, description: doc.description,
      tags: doc.tags.join(', '), intents: doc.intents.join(', '),
      dependencies: doc.dependencies.join(', '), antiPatterns: doc.antiPatterns.join(', '),
      implementationSteps: doc.implementationSteps.join('\n'),
      rules: doc.rules.join('\n'),
      examples: doc.examples.map(e => `${e.name}: ${e.description}`).join('\n'),
      references: doc.references.join(', '),
    })
    setEditDoc(doc)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        category: form.category,
        description: form.description,
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        intents: form.intents.split(',').map(s => s.trim()).filter(Boolean),
        dependencies: form.dependencies.split(',').map(s => s.trim()).filter(Boolean),
        antiPatterns: form.antiPatterns.split(',').map(s => s.trim()).filter(Boolean),
        implementationSteps: form.implementationSteps.split('\n').map(s => s.trim()).filter(Boolean),
        rules: form.rules.split('\n').map(s => s.trim()).filter(Boolean),
        examples: form.examples.split('\n').filter(Boolean).map(line => {
          const [name, ...rest] = line.split(':')
          return { name: name.trim(), description: rest.join(':').trim() }
        }),
        references: form.references.split(',').map(s => s.trim()).filter(Boolean),
      }

      if (editDoc) {
        await apiFetch(`/api/knowledge/${editDoc.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Knowledge updated')
      } else {
        await apiFetch('/api/knowledge', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Knowledge created')
      }
      setCreateOpen(false)
      setEditDoc(null)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      await apiFetch(`/api/knowledge/${deleteDoc.id}`, { method: 'DELETE' })
      toast.success('Knowledge deleted')
      setDeleteDoc(null)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleIngest = async () => {
    try {
      await apiFetch('/api/knowledge/ingest', { method: 'POST' })
      toast.success('Ingestion started')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to ingest')
    }
  }

  const handleRebuild = async () => {
    try {
      await apiFetch('/api/knowledge/rebuild', { method: 'POST' })
      toast.success('Embedding rebuild started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rebuild')
    }
  }

  const handleSimilar = async (doc: KnowledgeDoc) => {
    setSimilarDoc(doc)
    try {
      const res = await apiFetch<{ similar: KnowledgeDoc[] }>(`/api/knowledge/similar?slug=${doc.slug}&limit=5`)
      setSimilarResults(res.similar || [])
    } catch {
      setSimilarResults([])
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">{stats?.totalDocuments ?? 0} documents across {Object.keys(stats?.documentsByCategory ?? {}).length} categories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleIngest} variant="outline">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Ingest Files
          </Button>
          <Button size="sm" onClick={handleRebuild} variant="outline">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Rebuild Embeddings
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Knowledge
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No knowledge documents found</p>
          </div>
        ) : filtered.map(doc => (
          <Card key={doc.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium">{doc.title}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${CAT_COLORS[doc.category] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {doc.category}
                    </Badge>
                    {!doc.isActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{truncate(doc.description, 120)}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Access: {doc.accessCount}</span>
                    <span>Score: {doc.relevanceScore.toFixed(2)}</span>
                    <span>v{doc.version}</span>
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDoc(doc)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(doc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSimilar(doc)}>
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteDoc(doc)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editDoc} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditDoc(null) } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDoc ? 'Edit Knowledge' : 'Create Knowledge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Document title" />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2, tag3" />
              </div>
              <div className="space-y-1.5">
                <Label>Intents (comma-separated)</Label>
                <Input value={form.intents} onChange={e => setForm({ ...form, intents: e.target.value })} placeholder="intent1, intent2" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dependencies (comma-separated slugs)</Label>
                <Input value={form.dependencies} onChange={e => setForm({ ...form, dependencies: e.target.value })} placeholder="slug1, slug2" />
              </div>
              <div className="space-y-1.5">
                <Label>References (comma-separated slugs)</Label>
                <Input value={form.references} onChange={e => setForm({ ...form, references: e.target.value })} placeholder="slug1, slug2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Anti-Patterns (comma-separated)</Label>
              <Input value={form.antiPatterns} onChange={e => setForm({ ...form, antiPatterns: e.target.value })} placeholder="anti-pattern1, anti-pattern2" />
            </div>
            <div className="space-y-1.5">
              <Label>Implementation Steps (one per line)</Label>
              <Textarea value={form.implementationSteps} onChange={e => setForm({ ...form, implementationSteps: e.target.value })} placeholder="Step 1&#10;Step 2&#10;Step 3" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>Rules (one per line)</Label>
              <Textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} placeholder="Rule 1&#10;Rule 2" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>Examples (format: name: description, one per line)</Label>
              <Textarea value={form.examples} onChange={e => setForm({ ...form, examples: e.target.value })} placeholder="Example 1: Description here&#10;Example 2: Another description" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditDoc(null) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editDoc ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewDoc?.title}
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CAT_COLORS[viewDoc?.category ?? ''] || ''}`}>
                {viewDoc?.category}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">{viewDoc.description}</p>
              <Section title="Tags" icon={BookOpen} items={viewDoc.tags} color="text-emerald-500" />
              <Section title="Intents" icon={Lightbulb} items={viewDoc.intents} color="text-amber-500" />
              <Section title="Rules" icon={Shield} items={viewDoc.rules} color="text-red-500" />
              <Section title="Implementation Steps" icon={ListOrdered} items={viewDoc.implementationSteps} color="text-sky-500" />
              <Section title="Anti-Patterns" icon={Shield} items={viewDoc.antiPatterns} color="text-orange-500" />
              <Section title="Dependencies" icon={Link2} items={viewDoc.dependencies} color="text-teal-500" />
              {viewDoc.examples.length > 0 && (
                <Section title="Examples" icon={Lightbulb} items={viewDoc.examples.map(e => `${e.name}: ${e.description}`)} color="text-violet-500" />
              )}
              <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                <span>Version: {viewDoc.version}</span>
                <span>Access: {viewDoc.accessCount}</span>
                <span>Score: {viewDoc.relevanceScore.toFixed(2)}</span>
                <span>Updated: {formatDate(viewDoc.updatedAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => { if (!open) setDeleteDoc(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteDoc?.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Similar Documents */}
      <Dialog open={!!similarDoc} onOpenChange={(open) => { if (!open) { setSimilarDoc(null); setSimilarResults([]) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Similar to &ldquo;{similarDoc?.title}&rdquo;</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {similarResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No similar documents found</p>
            ) : similarResults.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${CAT_COLORS[doc.category] || ''}`}>
                    {doc.category}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">Score: {doc.relevanceScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
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
