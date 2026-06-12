'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// ─── CTA Button — opens sign-in dropdown from anywhere ────────────────────────
// Dispatches a custom 'open-signin' event that LoginDropdown listens for.
// This keeps the landing page as a Server Component while allowing CTAs
// to trigger the sign-in popover without a context provider.

interface CtaButtonProps {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showArrow?: boolean
}

export function CtaButton({ 
  children, 
  variant = 'default', 
  className = '', 
  size = 'default',
  showArrow = false,
}: CtaButtonProps) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-signin'))
  }

  return (
    <Button variant={variant} className={className} size={size} onClick={handleClick}>
      {children}
      {showArrow && <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />}
    </Button>
  )
}
