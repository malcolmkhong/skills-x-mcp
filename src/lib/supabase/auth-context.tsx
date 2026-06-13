'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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

  const supabase = createClient()

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
    // Get initial session
    supabase.auth.getUser().then(({ data: { user: sbUser } }) => {
      setUser(mapUser(sbUser))
      setStatus(sbUser ? 'authenticated' : 'unauthenticated')
    }).catch(() => {
      setStatus('unauthenticated')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sbUser = session?.user ?? null
      setUser(mapUser(sbUser))
      setStatus(sbUser ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, mapUser])

  const signInWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('OAuth sign in error:', error.message)
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error.message)
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
