'use client'

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MobileMenuToggle() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle mobile menu">
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 border-t border-border bg-card px-4 py-3 space-y-2 text-sm">
          <a href="#features" className="block py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Features</a>
          <a href="#knowledge" className="block py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Knowledge</a>
          <a href="#mcp" className="block py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>MCP Server</a>
          <a href="#faq" className="block py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>FAQ</a>
          <a href="#pricing" className="block py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Pricing</a>
        </div>
      )}
    </>
  )
}
