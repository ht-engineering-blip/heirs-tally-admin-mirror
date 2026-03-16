import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { DashboardLayout } from '@/components/layout'

const inter = Inter({ subsets: ['latin'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Heirs Tally Admin Dashboard',
  description: 'Heirs Tally Admin Dashboard - Heirs Tally',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.className} suppressHydrationWarning>
        <Providers> 
            {children} 
        </Providers>
      </body>
    </html>
  )
}
