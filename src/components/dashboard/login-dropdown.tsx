'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/supabase/auth-context'
import {
  Github, ChevronDown, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

// ─── Login Dropdown Panel (Client Component) ─────────────────────────────────
// Uses Radix Popover for proper click-outside, focus, and keyboard support.
// Listens for 'open-signin' custom event so CTA buttons anywhere on the page
// can open this dropdown without a context provider.

export function LoginDropdown() {
  const { signInWithOAuth } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  // Listen for 'open-signin' custom events from CTA buttons
  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('open-signin', handleOpen)
    return () => window.removeEventListener('open-signin', handleOpen)
  }, [])

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setLoading(provider)
    await signInWithOAuth(provider)
    // Page will redirect to OAuth provider, no need to setLoading(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm font-medium"
          aria-label="Sign In"
        >
          Sign In
          <ChevronDown className={`h-3.5 w-3.5 ml-1.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Welcome to IndustryX</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Sign in to access your dashboard</p>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-9 text-xs"
              onClick={() => handleOAuthLogin('github')}
              disabled={!!loading}
            >
              {loading === 'github' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Github className="h-3.5 w-3.5 mr-1.5" />
              )}
              GitHub
            </Button>
            <Button
              variant="outline"
              className="h-9 text-xs"
              onClick={() => handleOAuthLogin('google')}
              disabled={!!loading}
            >
              {loading === 'google' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-popover px-2 text-muted-foreground">secure auth via Supabase</span>
            </div>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Sign in with your GitHub or Google account
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
