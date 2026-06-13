import React from 'react'
import { FileQuestion, Home } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <FileQuestion className="h-8 w-8 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Check the URL or head back to the homepage.
          </p>
          <div className="mt-6 select-none text-8xl font-black text-emerald-500/20">
            404
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
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
