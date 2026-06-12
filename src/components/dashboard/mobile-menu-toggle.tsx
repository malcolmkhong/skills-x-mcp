'use client'

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CtaButton } from './cta-button'

const MOBILE_NAV_LINKS = [
  { href: '#problem', label: 'Problem' },
  { href: '#solution', label: 'Solution' },
  { href: '#comparison', label: 'Compare' },
  { href: '#live-demo', label: 'Live Demo' },
  { href: '#features', label: 'Features' },
  { href: '#mcp', label: 'MCP' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export function MobileMenuToggle() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle mobile menu">
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 border-t border-border bg-card px-4 py-4 space-y-1 text-sm shadow-lg">
          {MOBILE_NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-border">
            <CtaButton className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setOpen(false)}>
              Get Started
            </CtaButton>
          </div>
        </div>
      )}
    </>
  )
}
