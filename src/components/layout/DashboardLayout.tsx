'use client'

import { ReactNode, useEffect, useState } from 'react';
import { TenantSidebar } from './TenantSidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

    // Auto-collapse on mobile (but don't collapse if sidebar is open)
    useEffect(() => {
      if (isMobile && sidebarOpen) {
        setSidebarCollapsed(true);
      } else if (!isMobile) {
        // On desktop, allow manual collapse
        // Don't force collapse state
      }
    }, [isMobile, sidebarOpen]);
  

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <TenantSidebar isOpen={!isMobile || sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed}/>
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Header - shows different layout on mobile vs desktop */}
        <Header isMobile={isMobile} onMenuClick={() => setSidebarOpen(true)}  isCollapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}  />
        
        <div className={cn('p-8', isMobile && 'pt-4')}>
          {children}
        </div>
      </main>
    </div>
  );
}
