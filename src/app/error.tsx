'use client'

import React from 'react'
import { Brain, Home, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Brain className="h-8 w-8 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Something Went Wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            An unexpected error occurred while processing your request.
            This isn&apos;t supposed to happen — our team has been notified.
          </p>
          {error?.message && (
            <div className="rounded-lg bg-muted p-3">
              <p className="font-mono text-sm text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}
          {error?.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => reset()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href="/">
              <Home className="h-4 w-4" />
              Go Home
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
