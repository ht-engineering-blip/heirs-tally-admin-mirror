'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Building2,
  Settings,
  Shield,
  FileStack,
  Server,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Key,
  TestTube,
  Activity,
  KeyIcon,
  CogIcon,
  ListChecksIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useIsMobile } from '@/hooks/use-mobile'
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSession } from '@/hooks/use-session'
import { usePermissions } from '@/hooks/use-permissions'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  permission?: string
}

const systemNavItems: NavItem[] = [
  { title: 'FIRS Dictionary', href: '/admin/system/firs-dictionary', icon: FileStack, permission: 'system:view' },
  { title: 'ERP Support', href: '/admin/system/erp-support', icon: Server, permission: 'system:view' },
  { title: 'System Health', href: '/admin/system/health', icon: Activity, permission: 'system:view' },
  { title: 'Settings', href: '/admin/system/settings', icon: Settings, permission: 'system:view' },
]

const tenantNavItems: NavItem[] = [
  { title: 'Tenants', href: '/admin/tenants', icon: Building2, permission: 'tenants:read' },
  { title: 'ERP Sync Configurations', href: '/admin/tenants/erp-sync-config', icon: CogIcon, permission: 'tenants:read' },
  { title: 'API Keys', href: '/admin/tenants/api-keys', icon: KeyIcon, permission: 'tenants:read' },
  { title: 'Transaction Log', href: '/admin/tenants/transactions', icon: ListChecksIcon, permission: 'tenants:read' },
]

const sandboxNavItem: NavItem = {
  title: 'Sandbox',
  href: '/admin/sandbox',
  icon: TestTube,
  permission: 'sandbox:test',
}

interface AdminSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  onCollapse?: () => void
}

export function AdminSidebar({ isOpen = true, onClose, isCollapsed, onCollapse }: AdminSidebarProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { user } = useSession()
  const { hasPermission } = usePermissions()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/super-admin/login' })
  }

  // Filter nav items based on permissions
  const filteredSystemNavItems = systemNavItems.filter(
    (item) => !item.permission || hasPermission(item.permission as any)
  )
  const filteredTenantNavItems = tenantNavItems.filter(
    (item) => !item.permission || hasPermission(item.permission as any)
  )
  const showSandbox = hasPermission('sandbox:test')

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
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="animate-fade-in">
                  <h1 className="font-bold text-foreground">Heirs Tally</h1>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden min-h-0">
          <TooltipProvider>
            <div className="space-y-1">
              {/* Dashboard */}
              {(!isCollapsed || isMobile) && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Main
                </p>
              )}
              <NavLink
                href="/admin"
                icon={LayoutDashboard}
                label="Dashboard"
                isActive={pathname === '/admin'}
                isCollapsed={isCollapsed && !isMobile}
                isMobile={isMobile}
              />

              {/* System Configuration */}
              {filteredSystemNavItems.length > 0 && (
                <>
                  <Separator className="my-4" />
                  {(!isCollapsed || isMobile) && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      System
                    </p>
                  )}
                  {filteredSystemNavItems.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.title}
                      isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
                      isCollapsed={isCollapsed && !isMobile}
                      isMobile={isMobile}
                    />
                  ))}
                </>
              )}

              {/* Tenant Management */}
              {filteredTenantNavItems.length > 0 && (
                <>
                  <Separator className="my-4" />
                  {(!isCollapsed || isMobile) && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Management
                    </p>
                  )}
{/*                   || pathname?.startsWith(item.href + '/') */}
                  {filteredTenantNavItems.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.title}
                      isActive={pathname === item.href }
                      isCollapsed={isCollapsed && !isMobile}
                      isMobile={isMobile}
                    />
                  ))}
                </>
              )}

              {/* Sandbox */}
              {showSandbox && (
                <>
                  <Separator className="my-4" />
                  {(!isCollapsed || isMobile) && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Testing
                    </p>
                  )}
                  <NavLink
                    href={sandboxNavItem.href}
                    icon={sandboxNavItem.icon}
                    label={sandboxNavItem.title}
                    isActive={pathname === sandboxNavItem.href || pathname?.startsWith(sandboxNavItem.href + '/')}
                    isCollapsed={isCollapsed && !isMobile}
                    isMobile={isMobile}
                  />
                </>
              )}
            </div>
          </TooltipProvider>
        </nav>

        {/* Collapse button - hidden on mobile */}
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
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role?.replace('_', ' ') || 'Admin'}
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
  isActive: boolean
  isCollapsed: boolean
  isMobile: boolean
  onClick?: () => void
}

function NavLink({ href, icon: Icon, label, isActive, isCollapsed, isMobile, onClick }: NavLinkProps) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        'nav-item',
        isActive ? 'nav-item-active' : 'nav-item-inactive',
        isCollapsed && 'justify-center px-2'
      )}
      onClick={onClick}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {(!isCollapsed || isMobile) && <span>{label}</span>}
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
