'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search, ChevronRight, ChevronDown, Folder, FolderOpen, FileText,
  Zap, Terminal, Layers, Shield, Globe, Palette, Settings2, Component,
  Puzzle, SunMoon, Accessibility, Scale, Image, SwatchBook, SquareCode,
  Building2, ShieldCheck, Coins, Wrench, ClipboardList, Rocket,
  Boxes, GitBranch, KeyRound, Eye, Banknote, CreditCard, HardDrive,
  ArrowLeftRight, Truck, Siren, GitMerge, FileQuestion, Loader2,
  BookOpen, Lightbulb, ListOrdered, Link2, ArrowUpRight, Tag,
  ChevronUp, X, PanelLeftClose, PanelLeft, Hash,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string
  label: string
  icon?: string
  type?: 'plugin' | 'domain' | 'commands' | 'category' | 'skill' | 'command'
  children?: TreeNode[]
  skillData?: SkillData | null
  depth: number
  path: string[]
}

interface SkillData {
  name: string
  description: string
  role?: string
  whatYouDo?: string
  [key: string]: unknown
}

interface TreeStats {
  totalSkills: number
  totalCategorized: number
  totalUncategorized: number
  dsSkills: number
  dsCommands: number
  rootKnowledge: number
  plugins: number
}

interface SearchResult {
  name: string
  data: SkillData
  matchField: string
}

// ─── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Palette, Layers, SwatchBook, Image, Component, SquareCode, Puzzle,
  Settings2, SunMoon, Zap, Globe, ShieldCheck, Accessibility, Scale,
  Terminal, Building2, Shield, Coins, Wrench, ClipboardList, Rocket,
  Boxes, GitBranch, KeyRound, Eye, Banknote, CreditCard, HardDrive,
  ArrowLeftRight, Truck, Siren, GitMerge, FileQuestion,
}

function getNodeIcon(node: TreeNode, isOpen: boolean): React.ElementType {
  if (node.type === 'skill' || node.type === 'command') {
    return node.type === 'command' ? Terminal : FileText
  }
  if (node.icon && ICON_MAP[node.icon]) return ICON_MAP[node.icon]
  return isOpen ? FolderOpen : Folder
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countLeaves(node: TreeNode): number {
  if (!node.children || node.children.length === 0) return 1
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0)
}

function flattenSkills(node: TreeNode): TreeNode[] {
  if (node.type === 'skill' || node.type === 'command') return [node]
  if (!node.children) return []
  return node.children.flatMap(flattenSkills)
}

function findNodeById(tree: TreeNode[], id: string): TreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

function collectAllIds(tree: TreeNode[]): string[] {
  const ids: string[] = []
  for (const node of tree) {
    if (node.children && node.children.length > 0) {
      ids.push(node.id)
      ids.push(...collectAllIds(node.children))
    }
  }
  return ids
}

// ─── Skill Detail Renderer ─────────────────────────────────────────────────

function SkillDetail({ skill, type }: { skill: SkillData; type: string }) {
  if (!skill) return null

  // For design-system skills with rich structure
  const isDesignSystemSkill = !!skill.role || !!skill.whatYouDo
  const isCommand = type === 'command'
  const entries = Object.entries(skill).filter(
    ([key]) => !key.startsWith('_') && key !== 'name' && key !== 'description'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Badge
            variant="outline"
            className={
              isCommand
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs'
            }
          >
            {isCommand ? 'Command' : 'Skill'}
          </Badge>
        </div>
        <h1 className="text-xl font-bold leading-tight">
          {(skill.title || skill.name || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{skill.description}</p>
      </div>

      {/* Role / What You Do */}
      {(skill.role || skill.whatYouDo) && (
        <div className="space-y-3">
          {skill.role && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Role</span>
              </div>
              <p className="text-sm leading-relaxed">{skill.role as string}</p>
            </div>
          )}
          {skill.whatYouDo && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">What You Do</span>
              </div>
              <p className="text-sm leading-relaxed">{skill.whatYouDo as string}</p>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Structured content sections */}
      <div className="space-y-4">
        {entries.map(([key, value]) => (
          <DataSection key={key} fieldKey={key} value={value} />
        ))}
      </div>
    </div>
  )
}

// ─── Dynamic data section renderer ──────────────────────────────────────────

function DataSection({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const [collapsed, setCollapsed] = useState(false)
  const label = fieldKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()

  // Count items
  const count = getItemCount(value)
  if (count === 0 && !value) return null

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium">{label}</span>
        {count > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{count}</Badge>
        )}
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 pt-1 border-t border-border/40">
          <ValueRenderer value={value} depth={0} />
        </div>
      )}
    </div>
  )
}

function getItemCount(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'object' && value !== null) return Object.keys(value).length
  if (typeof value === 'string') return 1
  return value ? 1 : 0
}

function ValueRenderer({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">—</span>

  // String
  if (typeof value === 'string') {
    return <p className="text-sm text-foreground leading-relaxed">{value}</p>
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-muted-foreground">Empty</span>

    // Check if array of objects with known structure
    if (typeof value[0] === 'object' && value[0] !== null) {
      return (
        <div className="space-y-2">
          {value.map((item, i) => (
            <div key={i} className="bg-muted/30 rounded-md p-3 border border-border/30">
              <ObjectRenderer obj={item as Record<string, unknown>} depth={depth + 1} />
            </div>
          ))}
        </div>
      )
    }

    // Array of primitives
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs font-normal">
            {String(item)}
          </Badge>
        ))}
      </div>
    )
  }

  // Object
  if (typeof value === 'object') {
    return <ObjectRenderer obj={value as Record<string, unknown>} depth={depth} />
  }

  // Primitive
  return <span className="text-sm font-mono">{String(value)}</span>
}

function ObjectRenderer({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const entries = Object.entries(obj)
  if (entries.length === 0) return <span className="text-xs text-muted-foreground">Empty object</span>

  return (
    <div className={depth > 0 ? 'space-y-1.5' : 'space-y-2'}>
      {entries.map(([key, val]) => {
        const displayKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
          .trim()

        return (
          <div key={key} className="flex gap-3 items-start">
            <span className="text-xs font-medium text-muted-foreground min-w-[120px] shrink-0 pt-0.5 text-right">
              {displayKey}
            </span>
            <div className="flex-1 min-w-0">
              {typeof val === 'string' ? (
                <span className="text-sm">{val}</span>
              ) : Array.isArray(val) ? (
                <div className="flex flex-wrap gap-1">
                  {val.map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                      {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                    </Badge>
                  ))}
                </div>
              ) : typeof val === 'object' && val !== null ? (
                <div className="bg-muted/20 rounded p-2 border border-border/20">
                  <ObjectRenderer obj={val as Record<string, unknown>} depth={depth + 1} />
                </div>
              ) : (
                <span className="text-sm font-mono">{String(val)}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Node Icon (stable component to avoid render-time component creation) ────

function NodeIcon({ iconName, isOpen, isLeaf, nodeType, className }: {
  iconName: string
  isOpen: boolean
  isLeaf: boolean
  nodeType?: string
  className: string
}) {
  if (isLeaf) {
    return nodeType === 'command'
      ? <Terminal className={className} />
      : <FileText className={className} />
  }
  const ResolvedIcon = (iconName && ICON_MAP[iconName]) || (isOpen ? FolderOpen : Folder)
  return <ResolvedIcon className={className} />
}

function CategoryIcon({ iconName, className }: { iconName: string; className: string }) {
  const ResolvedIcon = (iconName && ICON_MAP[iconName]) || Folder
  return <ResolvedIcon className={className} />
}

// ─── Tree Node Component ────────────────────────────────────────────────────

function TreeNodeItem({
  node,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: TreeNode
  selectedId: string | null
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (node: TreeNode) => void
}) {
  const hasChildren = node.children && node.children.length > 0
  const isOpen = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const isLeaf = node.type === 'skill' || node.type === 'command'
  const leafCount = hasChildren ? countLeaves(node) : 0
  const iconName = node.icon || ''
  const iconClassName = `h-3.5 w-3.5 shrink-0 ${
    isLeaf
      ? node.type === 'command'
        ? 'text-amber-500'
        : 'text-emerald-500'
      : 'text-muted-foreground'
  }`

  return (
    <div>
      <button
        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[13px] transition-colors group ${
          isSelected
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
            : 'hover:bg-accent/60 text-foreground/90'
        }`}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) onToggle(node.id)
          onSelect(node)
        }}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <NodeIcon iconName={iconName} isOpen={isOpen} isLeaf={isLeaf} nodeType={node.type} className={iconClassName} />
        <span className="truncate flex-1 text-left">{node.label}</span>
        {hasChildren && !isLeaf && (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {leafCount}
          </span>
        )}
      </button>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function KnowledgeTab() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [stats, setStats] = useState<TreeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false)

  // Load tree data
  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge/tree')
      const data = await res.json()
      if (data.tree) {
        setTree(data.tree)
        setStats(data.stats)
        // Auto-expand first level
        const firstLevelIds = data.tree.map((n: TreeNode) => n.id).filter((id: string) => data.tree.find((n: TreeNode) => n.id === id)?.children?.length)
        setExpandedIds(new Set(firstLevelIds))
      }
    } catch {
      toast.error('Failed to load knowledge tree')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTree() }, [loadTree])

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/knowledge/tree?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelect = useCallback((node: TreeNode) => {
    setSelectedId(node.id)
  }, [])

  const selectedNode = useMemo(() => {
    if (!selectedId) return null
    return findNodeById(tree, selectedId)
  }, [tree, selectedId])

  // Skills within selected category
  const categorySkills = useMemo(() => {
    if (!selectedNode) return []
    if (selectedNode.type === 'skill' || selectedNode.type === 'command') return []
    return flattenSkills(selectedNode)
  }, [selectedNode])

  // Expand all / collapse all
  const expandAll = useCallback(() => {
    setExpandedIds(new Set(collectAllIds(tree)))
  }, [tree])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-72 border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ─── Tree Panel ────────────────────────────────────────────── */}
      {!treePanelCollapsed && (
        <div className="w-72 border-r border-border bg-card/50 flex flex-col shrink-0">
          {/* Tree header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Knowledge</h2>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={expandAll} title="Expand all">
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={collapseAll} title="Collapse all">
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTreePanelCollapsed(true)} title="Hide panel">
                  <PanelLeftClose className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="px-3 py-2 border-b border-border flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5" />{stats.totalSkills} skills</span>
              <span className="flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{stats.plugins} plugin</span>
              {stats.totalUncategorized > 0 && (
                <span className="text-amber-600 dark:text-amber-400">{stats.totalUncategorized} uncategorized</span>
              )}
            </div>
          )}

          {/* Search results or tree */}
          <ScrollArea className="flex-1">
            {searchQuery ? (
              <div className="p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {searchResults.map(result => (
                      <button
                        key={result.name}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors ${
                          selectedId === result.name
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'hover:bg-accent/60'
                        }`}
                        onClick={() => {
                          setSelectedId(result.name)
                          // Create a virtual node for the search result
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="truncate">
                            {result.data.title || result.data.name || result.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            Match: {result.matchField}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2">
                {tree.map(node => (
                  <TreeNodeItem
                    key={node.id}
                    node={node}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    onToggle={handleToggle}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* ─── Main Content Area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-10 border-b border-border bg-card/50 flex items-center px-4 gap-2 shrink-0">
          {treePanelCollapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTreePanelCollapsed(false)}>
              <PanelLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          {/* Breadcrumbs */}
          {selectedNode ? (
            <div className="flex items-center gap-1 text-xs min-w-0">
              {selectedNode.path.map((segment, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <span className={i === selectedNode.path.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                    {segment}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Select a skill or category to view details</span>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-5xl">
            {/* No selection state */}
            {!selectedNode && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Knowledge Base</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Browse the tree on the left to explore skills, or use search to find specific knowledge. Skills are organized in a hierarchical category structure.
                </p>
                {stats && (
                  <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{stats.totalSkills} skills</span>
                    <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{stats.plugins} plugin</span>
                    <span className="flex items-center gap-1.5"><Folder className="h-3.5 w-3.5" />{stats.totalCategorized} categorized</span>
                  </div>
                )}
              </div>
            )}

            {/* Skill detail */}
            {selectedNode && (selectedNode.type === 'skill' || selectedNode.type === 'command') && selectedNode.skillData && (
              <SkillDetail skill={selectedNode.skillData} type={selectedNode.type || 'skill'} />
            )}

            {/* Skill node without data (search result) */}
            {selectedNode && (selectedNode.type === 'skill' || selectedNode.type === 'command') && !selectedNode.skillData && (
              <SearchResultDetail skillName={selectedNode.id} />
            )}

            {/* Category overview */}
            {selectedNode && selectedNode.type !== 'skill' && selectedNode.type !== 'command' && (
              <CategoryOverview node={selectedNode} skills={categorySkills} onSelect={handleSelect} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ─── Category Overview ──────────────────────────────────────────────────────

function CategoryOverview({ node, skills, onSelect }: { node: TreeNode; skills: TreeNode[]; onSelect: (n: TreeNode) => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {node.type === 'plugin' && <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 text-xs">Plugin</Badge>}
          {node.type === 'commands' && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">Commands</Badge>}
          {node.type === 'domain' && <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 text-xs">Domain</Badge>}
          {node.type === 'category' && <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 text-xs">Category</Badge>}
        </div>
        <h1 className="text-xl font-bold">{node.label}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {skills.length} skill{skills.length !== 1 ? 's' : ''} in this category
        </p>
      </div>

      {/* Sub-categories */}
      {node.children && node.children.filter(c => c.type !== 'skill' && c.type !== 'command').length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sub-Categories</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {node.children
              .filter(c => c.type !== 'skill' && c.type !== 'command')
              .map(child => {
                const childSkills = flattenSkills(child)
                const childIconName = child.icon || ''
                return (
                  <button
                    key={child.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-border hover:bg-accent/30 transition-colors text-left"
                    onClick={() => onSelect(child)}
                  >
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <CategoryIcon iconName={childIconName} className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{child.label}</div>
                      <div className="text-[11px] text-muted-foreground">{childSkills.length} skill{childSkills.length !== 1 ? 's' : ''}</div>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Skills list */}
      {skills.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Skills</h3>
          <div className="space-y-2">
            {skills.map(skill => {
              const data = skill.skillData
              return (
                <button
                  key={skill.id}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-border hover:bg-accent/30 transition-colors text-left"
                  onClick={() => onSelect(skill)}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    skill.type === 'command'
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-emerald-100 dark:bg-emerald-900/30'
                  }`}>
                    {skill.type === 'command' ? (
                      <Terminal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{skill.label}</span>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 ${
                        skill.type === 'command'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      }`}>
                        {skill.type === 'command' ? 'cmd' : 'skill'}
                      </Badge>
                    </div>
                    {data?.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{data.description as string}</p>
                    )}
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Search Result Detail (lazy-loaded) ─────────────────────────────────────

function SearchResultDetail({ skillName }: { skillName: string }) {
  const [skill, setSkill] = useState<SkillData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchSkill = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/knowledge/tree?skill=${encodeURIComponent(skillName)}`)
        const data = await res.json()
        if (!cancelled && data.skill) {
          setSkill(data.skill)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSkill()
    return () => { cancelled = true }
  }, [skillName])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Skill &ldquo;{skillName}&rdquo; not found</p>
      </div>
    )
  }

  return <SkillDetail skill={skill} type={skill._domain ? 'skill' : 'skill'} />
}
