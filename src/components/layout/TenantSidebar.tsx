'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Building2,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  TestTube,
  RefreshCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useIsMobile } from '@/hooks/use-mobile'
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSession } from '@/hooks/use-session'
import { useTenant } from '@/hooks/use-tenant'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
}

interface TenantSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  onCollapse?: () => void
}

export function TenantSidebar({ isOpen = true, onClose, isCollapsed, onCollapse }: TenantSidebarProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { user } = useSession()
  const { isOnboardingComplete } = useTenant()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  const isRouteActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || (pathname?.startsWith(href + '/') ?? false)
  }

  const mainNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...(!isOnboardingComplete
      ? [{ title: 'Onboarding', href: '/dashboard/onboarding', icon: ClipboardCheck, badge: 'Setup' }]
      : []),
    { title: 'Transactions', href: '/dashboard/transactions', icon: FileText },
    { title: 'ERP Sync', href: '/dashboard/erp-sync', icon: RefreshCcw },
    { title: 'Sandbox', href: '/dashboard/sandbox', icon: TestTube },
  ]

  const managementNavItems: NavItem[] = [
    { title: 'Profile', href: '/dashboard/profile', icon: Building2 },
    { title: 'Team', href: '/dashboard/team', icon: Users },
    { title: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const sidebarWidth = isMobile
    ? 'w-[260px]'
    : isCollapsed ? 'w-[72px]' : 'w-[260px]'

  const mobileClasses = isMobile
    ? cn(
        'fixed left-0 top-0 z-50 transform transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        !isOpen && 'pointer-events-none'
      )
    : 'relative'

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
          'flex flex-col h-screen bg-sidebar/95 transition-all duration-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-card',
          sidebarWidth,
          mobileClasses
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 shrink-0">
          <div className="flex items-center gap-3 flex-1">
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
            <div className={cn('flex items-center gap-3', isMobile && isOpen && 'ml-3')}>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="animate-fade-in">
                  <h1 className="font-bold text-foreground">Heirs Tally</h1>
                  <p className="text-xs text-muted-foreground">E-Invoicing</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden min-h-0">
          <TooltipProvider>
            <div className="space-y-1">
              {/* Main */}
              {(!isCollapsed || isMobile) && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Main
                </p>
              )}
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.title}
                  badge={item.badge}
                  isActive={isRouteActive(item.href)}
                  isCollapsed={isCollapsed && !isMobile}
                  isMobile={isMobile}
                />
              ))}

              {/* Management */}
              <Separator className="my-4" />
              {(!isCollapsed || isMobile) && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Management
                </p>
              )}
              {managementNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.title}
                  isActive={isRouteActive(item.href)}
                  isCollapsed={isCollapsed && !isMobile}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </TooltipProvider>
        </nav>

        {/* Collapse button */}
        {!isMobile && onCollapse && (
          <div className="px-3 py-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCollapse}
              className="w-full justify-center"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Theme Switcher */}
        <div className="px-3 py-2 shrink-0">
          <ThemeSwitcher
            variant="sidebar"
            showLabel={!isCollapsed || isMobile}
            showTooltip={isCollapsed && !isMobile}
            size="sm"
          />
        </div>

        {/* User section */}
        <div className="p-3 shrink-0">
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors',
              isCollapsed && !isMobile && 'justify-center'
            )}
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role?.replace(/_/g, ' ') || 'Business Admin'}
                </p>
              </div>
            )}
            {(!isCollapsed || isMobile) && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ElementType
  label: string
  badge?: string
  isActive: boolean
  isCollapsed?: boolean
  isMobile: boolean
}

function NavLink({ href, icon: Icon, label, badge, isActive, isCollapsed, isMobile }: NavLinkProps) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        'nav-item',
        isActive ? 'nav-item-active' : 'nav-item-inactive',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {(!isCollapsed || isMobile) && (
        <span className="flex-1">{label}</span>
      )}
      {(!isCollapsed || isMobile) && badge && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
          {badge}
        </Badge>
      )}
    </Link>
  )

  const showTooltip = isCollapsed && !isMobile

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
