import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { DashboardLayout } from '@/components/layout'

const inter = Inter({ subsets: ['latin'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Heirs E-Invoicing Admin',
  description:
    "A multi-tenant B2B e-invoicing platform that helps businesses generate, validate, and submit invoices electronically in compliance with NRS/FIRS requirements in Nigeria.",
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
