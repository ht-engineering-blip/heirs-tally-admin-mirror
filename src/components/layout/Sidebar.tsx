'use client'

import { Logo } from '@/components/shared/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Activity,
  Building2,
  FileStack,
  FileText,
  Key,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
  Shield,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Tenants', href: '/tenants', icon: Building2 },
  { title: 'Transactions', href: '/transactions', icon: FileText },
  { title: 'Users', href: '/users', icon: Users },
  { title: 'API Keys', href: '/api-keys', icon: Key },
];

const systemNavItems: NavItem[] = [
  { title: 'System Health', href: '/system-health', icon: Activity },
  { title: 'NRS Dictionary', href: '/nrs-dictionary', icon: FileStack },
  { title: 'ERP Support', href: '/erp-support', icon: Server },
  { title: 'Security', href: '/security', icon: Shield },
  { title: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean; 
}

export function Sidebar({ isOpen = true, onClose, isCollapsed }: SidebarProps) { 
  const pathname = usePathname();
  const isMobile = useIsMobile();


  // On mobile, always use full width when open, on desktop use isCollapsed state
  const sidebarWidth = isMobile
    ? 'w-[260px]'
    : (isCollapsed ? 'w-[72px]' : 'w-[260px]');

  const mobileClasses = isMobile
    ? cn(
      'fixed left-0 top-0 z-50 transform transition-transform duration-300',
      isOpen ? 'translate-x-0' : '-translate-x-full',
      !isOpen && 'pointer-events-none'
    )
    : 'relative';

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    <aside
      className={cn(
          'rounded-r-xl flex flex-col h-screen bg-sidebar/95  transition-all duration-300 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sidebar z-50',
          sidebarWidth,
          mobileClasses,
          isMobile && !isOpen && 'pointer-events-none'
      )}
    >
      {/* Logo */}
        <div className="h-16 flex items-center px-4 shrink-0 relative">
          <div className="flex items-center gap-3 flex-1">
            <Logo 
              href="/"
              alt="HT E-Invoicing"
              linkClassName="text-base font-semibold tracking-tight text-foreground/70"
            />

            {(!isCollapsed || isMobile) && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-foreground">Heirs E-Invoicing</h1>
                <p className="text-xs text-muted-foreground">Admin Tenant</p>
              </div>
            )}

            {isMobile && isOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            )}

          </div>
         
        </div>


      {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden min-h-0 z-50">
          <TooltipProvider delayDuration={300} >
        <div className="space-y-1">
              {(!isCollapsed || isMobile) && (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Modules
            </p>
          )}
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                const showTooltip = isCollapsed && !isMobile;

                const linkContent = (
                  <Link
              key={item.href}
                    href={item.href}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                  'nav-item',
                  isActive ? 'nav-item-active' : 'nav-item-inactive',
                      isCollapsed && !isMobile && 'justify-center px-2'
                    )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && <span>{item.title}</span>}
                    {(!isCollapsed || isMobile) && item.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
                  </Link>
                );

                if (showTooltip) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
              {(!isCollapsed || isMobile) && (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System
            </p>
          )}
              {systemNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                const showTooltip = isCollapsed && !isMobile;

                const linkContent = (
                  <Link
              key={item.href}
                    href={item.href}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                  'nav-item',
                  isActive ? 'nav-item-active' : 'nav-item-inactive',
                      isCollapsed && !isMobile && 'justify-center px-2'
                    )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && <span>{item.title}</span>}
                  </Link>
                );

                if (showTooltip) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
        </div>
          </TooltipProvider>
      </nav>



      {/* User section */}
        <div className="p-3 shrink-0">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer',
              isCollapsed && !isMobile && 'justify-center'
          )}
        >
          <Avatar className="w-9 h-9">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              JA
            </AvatarFallback>
          </Avatar>
            {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-foreground truncate">
                John Adeyemi
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Super Admin
              </p>
            </div>
          )}
            {(!isCollapsed || isMobile) && (
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
