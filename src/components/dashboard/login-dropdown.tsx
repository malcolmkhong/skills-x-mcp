'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import {
  Github, Mail, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

// ─── Login Dropdown Panel (Client Component) ─────────────────────────────────
// Uses useRef + useEffect for click-outside detection instead of a backdrop div
// to prevent the click event from propagating and immediately closing the dropdown.

export function LoginDropdown() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('demo@industryx.io')
  const [password, setPassword] = useState('demo123')
  const [csrfToken, setCsrfToken] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch('/api/auth/csrf')
      .then(r => r.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => {})
  }, [])

  // Click-outside detection using document listener
  // This avoids the propagation issue with a backdrop div
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      // Use mousedown instead of click to catch events before they reach child elements
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm font-medium"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Sign In
        <ChevronDown className={`h-3.5 w-3.5 ml-1.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Sign in to IndustryX"
          className="absolute right-0 top-12 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Welcome to IndustryX</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in to access your dashboard</p>
          </div>

          <div className="p-4 space-y-3">
            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-9 text-xs"
                onClick={() => signIn('github', { callbackUrl: '/' })}
              >
                <Github className="h-3.5 w-3.5 mr-1.5" />
                GitHub
              </Button>
              <Button
                variant="outline"
                className="h-9 text-xs"
                onClick={() => signIn('google', { callbackUrl: '/' })}
              >
                <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">or use demo</span>
              </div>
            </div>

            {/* Demo Login Form — native submission for proper cookie handling */}
            <form action="/api/auth/callback/demo" method="POST" className="space-y-2.5">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <div>
                <label htmlFor="login-email" className="sr-only">Email</label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@industryx.io"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="sr-only">Password</label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Demo Sign In
              </Button>
            </form>

            <p className="text-[10px] text-center text-muted-foreground">
              Demo: <span className="font-mono">demo@industryx.io</span> / <span className="font-mono">demo123</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
