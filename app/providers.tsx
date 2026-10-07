'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BackgroundTaskProvider } from "@/components/shared/background-task"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    // refetchOnWindowFocus triggers a session re-validation (and the
    // re-renders that follow from it) every time the tab regains focus —
    // on pages with in-progress form state (e.g. Profile), that wipes
    // whatever the user was typing. The periodic refetchInterval already
    // keeps the session fresh without this.
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BackgroundTaskProvider>
              <Toaster />
              <Sonner richColors position="top-right" />
              {children}
            </BackgroundTaskProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
