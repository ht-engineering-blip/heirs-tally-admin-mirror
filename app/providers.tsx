'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SUPPORTED_ERPS_QUERY_KEY, fetchSupportedErps } from "@/hooks/use-supported-erps"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient()
    // Prefetch supported ERPs so data is ready before components mount
    client.prefetchQuery({
      queryKey: SUPPORTED_ERPS_QUERY_KEY,
      queryFn: fetchSupportedErps,
      staleTime: 5 * 60 * 1000,
    })
    return client
  })

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner richColors position="top-right" />
            {children}
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
