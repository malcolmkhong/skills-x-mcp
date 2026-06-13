'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email: string | undefined
  name: string | undefined
  image: string | undefined
  role: string
  plan: string
}

interface AuthContextType {
  user: AuthUser | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signInWithOAuth: (provider: 'github' | 'google') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'loading',
  signInWithOAuth: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const cancelledRef = useRef(false)

  // Memoize Supabase client so createClient() isn't called per render
  const supabase = useMemo(() => createClient(), [])

  const mapUser = useCallback((sbUser: User | null): AuthUser | null => {
    if (!sbUser) return null
    const meta = sbUser.user_metadata ?? {}
    return {
      id: sbUser.id,
      email: sbUser.email ?? undefined,
      name: meta.full_name ?? meta.name ?? sbUser.email?.split('@')[0] ?? undefined,
      image: meta.avatar_url ?? meta.picture ?? undefined,
      role: meta.role ?? 'user',
      plan: meta.plan ?? 'free',
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false

    // Get initial session
    supabase.auth.getUser().then(({ data: { user: sbUser }, error }) => {
      if (cancelledRef.current) return
      if (error) {
        toast.error('Failed to load session', { description: error.message })
      }
      setUser(mapUser(sbUser))
      setStatus(sbUser ? 'authenticated' : 'unauthenticated')
    }).catch((err) => {
      if (cancelledRef.current) return
      toast.error('Session error', { description: err instanceof Error ? err.message : 'Unknown error' })
      setStatus('unauthenticated')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelledRef.current) return
      const sbUser = session?.user ?? null
      setUser(mapUser(sbUser))
      setStatus(sbUser ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      cancelledRef.current = true
      subscription.unsubscribe()
    }
  }, [supabase, mapUser])

  const signInWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        toast.error('Sign in failed', { description: error.message })
      }
    } catch (err) {
      toast.error('Sign in failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      })
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Sign out failed', { description: error.message })
      // Don't clear user state on signOut failure — only clear if signOut succeeds
      return
    }
    setUser(null)
    setStatus('unauthenticated')
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, status, signInWithOAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
