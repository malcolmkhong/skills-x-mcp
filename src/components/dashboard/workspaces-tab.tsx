'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, UserPlus, Users, Shield, Crown,
  Loader2, MoreHorizontal, X,
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  type WorkspaceResponse, type WorkspaceMemberResponse,
  apiFetch, formatDate,
} from './types'

export default function WorkspacesTab() {
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedWs, setSelectedWs] = useState<WorkspaceResponse | null>(null)
  const [members, setMembers] = useState<WorkspaceMemberResponse[]>([])
  const [deleteWs, setDeleteWs] = useState<WorkspaceResponse | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [changingRoleMemberId, setChangingRoleMemberId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [form, setForm] = useState({ name: '', description: '', icon: '' })

  const loadWorkspaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ workspaces: WorkspaceResponse[] }>('/api/workspaces')
      setWorkspaces(data.workspaces || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workspaces'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])

  const loadMembers = async (ws: WorkspaceResponse) => {
    setSelectedWs(ws)
    try {
      const data = await apiFetch<{ members: WorkspaceMemberResponse[] }>(`/api/workspaces/${ws.id}/members`)
      setMembers(data.members || [])
    } catch (err) {
      setMembers([])
      toast.error(err instanceof Error ? err.message : 'Failed to load members')
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, description: form.description, icon: form.icon || undefined }),
      })
      toast.success('Workspace created')
      setCreateOpen(false)
      setForm({ name: '', description: '', icon: '' })
      loadWorkspaces()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteWs) return
    setDeleting(true)
    try {
      await apiFetch(`/api/workspaces/${deleteWs.id}`, { method: 'DELETE' })
      toast.success('Workspace deleted')
      setDeleteWs(null)
      if (selectedWs?.id === deleteWs.id) setSelectedWs(null)
      loadWorkspaces()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedWs || !newMemberEmail.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/workspaces/${selectedWs.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      })
      toast.success('Member added')
      setAddMemberOpen(false)
      setNewMemberEmail('')
      setNewMemberRole('member')
      loadMembers(selectedWs)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedWs) return
    setRemovingMemberId(memberId)
    try {
      await apiFetch(`/api/workspaces/${selectedWs.id}/members?memberId=${memberId}`, { method: 'DELETE' })
      toast.success('Member removed')
      loadMembers(selectedWs)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleChangeRole = async (memberId: string, role: string) => {
    if (!selectedWs) return
    setChangingRoleMemberId(memberId)
    try {
      await apiFetch(`/api/workspaces/${selectedWs.id}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ memberId, role }),
      })
      toast.success('Role updated')
      loadMembers(selectedWs)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setChangingRoleMemberId(null)
    }
  }

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    admin: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    member: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300',
  }

  const roleIcons: Record<string, React.ElementType> = {
    owner: Crown,
    admin: Shield,
    member: Users,
    viewer: Users,
  }

  const handleRetry = () => {
    setError(null)
    loadWorkspaces()
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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <p className="text-sm text-muted-foreground">{workspaces.length} workspace(s)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> Create Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace List */}
        <div className="lg:col-span-1 space-y-3">
          {workspaces.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No workspaces yet</p>
            </div>
          ) : workspaces.map(ws => (
            <Card
              key={ws.id}
              className={`cursor-pointer hover:shadow-sm transition-shadow ${selectedWs?.id === ws.id ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800' : ''}`}
              onClick={() => loadMembers(ws)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{ws.icon || '📁'} {ws.name}</h3>
                      {ws.isPersonal && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Personal</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{ws.description || 'No description'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {ws.memberCount} members</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColors[ws.userRole]}`}>
                        {ws.userRole}
                      </Badge>
                    </div>
                  </div>
                  {ws.userRole === 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600 text-xs" onClick={(e) => { e.stopPropagation(); setDeleteWs(ws) }}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workspace Detail / Members */}
        <div className="lg:col-span-2">
          {selectedWs ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedWs.icon || '📁'} {selectedWs.name}</CardTitle>
                    <CardDescription className="text-xs">{selectedWs.description || 'No description'}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setAddMemberOpen(true)}
                      disabled={selectedWs.userRole === 'viewer'}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Member
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedWs(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {members.map(member => {
                    const RoleIcon = roleIcons[member.role] || Users
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(member.name || member.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColors[member.role]}`}>
                            <RoleIcon className="h-2.5 w-2.5 mr-1" />
                            {member.role}
                          </Badge>
                          {selectedWs.userRole !== 'viewer' && member.role !== 'owner' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!!removingMemberId || !!changingRoleMemberId}>
                                  {(removingMemberId === member.id || changingRoleMemberId === member.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {['admin', 'member', 'viewer'].filter(r => r !== member.role).map(role => (
                                  <DropdownMenuItem key={role} className="text-xs" onClick={() => handleChangeRole(member.id, role)} disabled={!!changingRoleMemberId}>
                                    Change to {role}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem className="text-red-600 text-xs" onClick={() => handleRemoveMember(member.id)} disabled={!!removingMemberId}>
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {members.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No members found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a workspace to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Workspace" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (emoji)</Label>
              <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📁" className="w-20" />
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

      {/* Delete Workspace Confirmation */}
      <AlertDialog open={!!deleteWs} onOpenChange={(open) => { if (!open) setDeleteWs(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteWs?.name}&rdquo;? All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member to {selectedWs?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="user@example.com" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={saving || !newMemberEmail} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
