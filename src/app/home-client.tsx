'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  LayoutDashboard, Database, Search, Key, BarChart3, Server,
  Users, Settings, Sun, Moon, Brain, Menu, LogOut, ChevronLeft,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { NAV_TABS, type NavTabId } from '@/components/dashboard/types'

import LandingPage from '@/components/dashboard/landing-page'
import OverviewTab from '@/components/dashboard/overview-tab'
import KnowledgeTab from '@/components/dashboard/knowledge-tab'
import SearchTab from '@/components/dashboard/search-tab'
import ApiKeysTab from '@/components/dashboard/api-keys-tab'
import AnalyticsTab from '@/components/dashboard/analytics-tab'
import McpTab from '@/components/dashboard/mcp-tab'
import WorkspacesTab from '@/components/dashboard/workspaces-tab'
import SettingsTab from '@/components/dashboard/settings-tab'

// Icon map for navigation
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Database, Search, Key, BarChart3, Server, Users, Settings,
}

// Sidebar Nav component
function SidebarNav({ activeTab, onNavigate }: { activeTab: NavTabId; onNavigate: (tab: string) => void }) {
  return (
    <nav className="flex-1 p-2 space-y-0.5">
      {NAV_TABS.map(item => {
        const Icon = ICON_MAP[item.icon] || LayoutDashboard
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : ''}`} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<NavTabId>('overview')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const seededRef = useRef(false)

  // Seed database on first authenticated load if needed
  useEffect(() => {
    if (status !== 'authenticated' || seededRef.current) return
    let cancelled = false
    const doSeed = async () => {
      try {
        const res = await fetch('/api/health')
        const data = await res.json()
        if (data.userCount === 0 && !cancelled) {
          await fetch('/api/seed', { method: 'POST' })
          if (!cancelled) toast.success('Database seeded with demo data')
        }
        if (!cancelled) seededRef.current = true
      } catch {
        // Ignore seed errors
      }
    }
    doSeed()
    return () => { cancelled = true }
  }, [status])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab as NavTabId)
    setMobileOpen(false)
  }, [])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Unauthenticated — show landing page (NOT a login wall)
  if (status === 'unauthenticated' || !session) {
    return <LandingPage />
  }

  // ─── Authenticated — show dashboard ─────────────────────────────────
  const user = session.user
  const userName = user?.name || user?.email || 'User'
  const userInitial = userName[0].toUpperCase()

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab onNavigate={handleNavigate} />
      case 'knowledge': return <KnowledgeTab />
      case 'search': return <SearchTab />
      case 'keys': return <ApiKeysTab />
      case 'analytics': return <AnalyticsTab />
      case 'mcp': return <McpTab />
      case 'workspaces': return <WorkspacesTab />
      case 'settings': return <SettingsTab userEmail={user?.email} userName={user?.name} />
      default: return <OverviewTab onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {sidebarVisible && (
          <aside className="hidden md:flex flex-col border-r border-border bg-card w-56 shrink-0">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                  <Brain className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight">IndustryX</div>
                  <div className="text-[10px] text-muted-foreground">Knowledge MCP Provider</div>
                </div>
              </div>
            </div>
            <SidebarNav activeTab={activeTab} onNavigate={handleNavigate} />
            <div className="p-2 border-t border-border space-y-1">
              <Button variant="ghost" className="w-full h-8 text-xs justify-start" onClick={toggleTheme} suppressHydrationWarning>
                {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span className="ml-2">{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
              <Button variant="ghost" className="w-full h-8 text-xs justify-start" onClick={() => setSidebarVisible(false)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="ml-2">Hide Sidebar</span>
              </Button>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              {!sidebarVisible && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarVisible(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              {!sidebarVisible && (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center">
                    <Brain className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold">IndustryX</span>
                </div>
              )}
              <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />
              <h2 className="text-sm font-medium hidden sm:block">
                {NAV_TABS.find(t => t.id === activeTab)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} suppressHydrationWarning>
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 px-2 gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-emerald-600 text-white">{userInitial}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs hidden sm:inline max-w-24 truncate">{userName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs" onClick={() => handleNavigate('settings')}>
                    <Settings className="h-3.5 w-3.5 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-red-600" onClick={() => signOut({ callbackUrl: '/' })}>
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {renderTab()}
          </main>

          <footer className="h-8 border-t border-border bg-card flex items-center justify-center px-4 shrink-0">
            <p className="text-[10px] text-muted-foreground">
              IndustryX Knowledge MCP Platform &middot; v1.1.0 &middot; &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Brain className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm">IndustryX</div>
                <div className="text-[10px] text-muted-foreground">Knowledge MCP Provider</div>
              </div>
            </SheetTitle>
          </SheetHeader>
          <SidebarNav activeTab={activeTab} onNavigate={handleNavigate} />
          <div className="p-2 border-t border-border">
            <Button variant="ghost" className="w-full h-8 text-xs justify-start text-red-600" onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/' }) }}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="ml-2">Sign Out</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
