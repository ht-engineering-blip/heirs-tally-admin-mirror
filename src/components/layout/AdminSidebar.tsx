'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutDialog } from '@/components/shared/LogoutDialog'
import { Logo } from '@/components/shared/Logo'
import {
  LayoutDashboard,
  Building2,
  Settings,
  Shield,
  FileStack,
  Server,
  ChevronDown,
  ChevronUp,
  LogOut,
  X,
  Key,
  TestTube,
  Activity,
  KeyIcon,
  CogIcon,
  ListChecksIcon,
  Webhook,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSession } from '@/hooks/use-session'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '../ui/badge'

export interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  permission?: string
  children?: NavItem[]
}

const systemNavItems: NavItem[] = [
  { title: 'NRS Dictionary', href: '/admin/system/nrs-dictionary', icon: FileStack, permission: 'system:view' },
  { title: 'ERP Support', href: '/admin/system/erp-support', icon: Server, permission: 'system:view' },
  /*   { title: 'System Health', href: '/admin/system/health', icon: Activity, permission: 'system:view' },
    { title: 'Settings', href: '/admin/system/settings', icon: Settings, permission: 'system:view' }, */
]

const tenantNavItems: NavItem[] = [
  {
    title: 'Tenants',
    href: '/admin/tenants',
    icon: Building2,
    permission: 'tenants:read',
    children: [
      { title: 'All Tenants', href: '/admin/tenants/all', icon: Building2, permission: 'tenants:read' },
      { title: 'ERP Sync Configurations', href: '/admin/tenants/erp-sync-config', icon: CogIcon, permission: 'tenants:read' },
      { title: 'Webhook Configurations', href: '/admin/tenants/webhook-config', icon: Webhook, permission: 'tenants:read' },
      { title: 'API Keys', href: '/admin/tenants/api-keys', icon: KeyIcon, permission: 'tenants:read' },
      { title: 'Transaction Log', href: '/admin/tenants/transactions', icon: ListChecksIcon, permission: 'tenants:read' },
    ],
  },
]

// Static path segments that live directly under /admin/tenants/ as siblings
// of the tenant-detail dynamic route ([tenantId]).
const TENANT_STATIC_SEGMENTS = ['all', 'erp-sync-config', 'webhook-config', 'api-keys', 'transactions']

// Whether `path` belongs to `childHref` for sidebar highlighting purposes.
// Handles the ordinary case (exact match or nested route) plus one special
// case: the tenant detail page (/admin/tenants/:tenantId) is reached from
// "All Tenants" but isn't nested under its URL (/admin/tenants/all/...) —
// it's a sibling dynamic segment — so it wouldn't match a plain prefix check.
function matchesChildRoute(childHref: string, path: string | null): boolean {
  if (!path) return false
  if (path === childHref || path.startsWith(childHref + '/')) return true
  if (childHref === '/admin/tenants/all') {
    const match = path.match(/^\/admin\/tenants\/([^/]+)/)
    if (match && !TENANT_STATIC_SEGMENTS.includes(match[1])) return true
  }
  return false
}

const sandboxNavItem: NavItem = {
  title: 'Sandbox',
  href: '/admin/sandbox',
  icon: TestTube,
  permission: 'sandbox:test',
}

const auditNavItem: NavItem = {
  title: 'Audit Logs',
  href: '/admin/audit',
  icon: Shield,
  permission: 'audit:read',
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const handleNavClick = isMobile ? onClose : undefined

  // Initialize expanded items based on current pathname
  useEffect(() => {
    const newExpanded = new Set<string>()

    // Check if any tenant child route is active
    tenantNavItems.forEach((item) => {
      if (item.children) {
        // Check if pathname exactly matches the parent href
        const isParentExactMatch = pathname === item.href
        // Check if pathname starts with parent href (for nested routes)
        const isParentPath = pathname?.startsWith(item.href + '/')
        // Check if any child route is active
        const hasActiveChild = item.children.some((child) => matchesChildRoute(child.href, pathname))

        // Expand if parent is clicked (exact match) or has active child or is in parent path
        if (isParentExactMatch || hasActiveChild || isParentPath) {
          newExpanded.add(item.href)
        }
      }
    })

    setExpandedItems(newExpanded)
  }, [pathname])

  const toggleExpanded = (href: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(href)) {
      newExpanded.delete(href)
    } else {
      newExpanded.add(href)
    }
    setExpandedItems(newExpanded)
  }

  // Filter nav items based on permissions
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => !item.permission || hasPermission(item.permission as any))
      .map((item) => {
        if (item.children) {
          return {
            ...item,
            children: filterNavItems(item.children),
          }
        }
        return item
      })
      .filter((item) => {
        // Remove parent items if they have no visible children
        if (item.children && item.children.length === 0) {
          return false
        }
        return true
      })
  }

  const filteredSystemNavItems = filterNavItems(systemNavItems)
  const filteredTenantNavItems = filterNavItems(tenantNavItems)
  const showSandbox = hasPermission('sandbox:test')
  const showAudit = hasPermission('audit:read')

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

  // Helper function to check if a route is active (exact match)
  const isRouteActiveExact = (href: string): boolean => {
    return pathname === href
  }

  // Helper function to check if a parent item has an active child
  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false
    return item.children.some((child) => matchesChildRoute(child.href, pathname))
  }

  // Helper function to check if parent should be highlighted (but not as active)
  const isParentHighlighted = (item: NavItem): boolean => {
    return hasActiveChild(item) && !isRouteActiveExact(item.href)
  }

  // Helper function to check if a route is active (including nested routes)
  const isRouteActive = (href: string, isChild: boolean = false): boolean => {
    if (isChild) {
      return matchesChildRoute(href, pathname)
    } else {
      // For parent routes, check exact match
      return pathname === href
    }
  }

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
              <Logo
                href="/admin/dashboard"
                alt="Heirs E-Invoicing"
                showText={!isCollapsed || isMobile}
                title="Heirs E-Invoicing Admin"
                subtitle="Super Admin"
              />
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
                onClick={handleNavClick}
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
                      isActive={isRouteActive(item.href)}
                      isCollapsed={isCollapsed && !isMobile}
                      isMobile={isMobile}
                      onClick={handleNavClick}
                    />
                  ))}
                </>
              )}

              {/* Tenant Management - Multi-level */}
              {filteredTenantNavItems.length > 0 && (
                <>
                  <Separator className="my-4" />
                  {(!isCollapsed || isMobile) && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Management
                    </p>
                  )}
                  {filteredTenantNavItems.map((item) => {
                    const isExpanded = expandedItems.has(item.href)
                    const isParentActiveExact = isRouteActiveExact(item.href)
                    const isParentHighlightedState = isParentHighlighted(item)
                    const hasChildren = item.children && item.children.length > 0

                    return (
                      <div key={item.href} className="space-y-0">
                        {/* Parent Item */}
                        <NavLinkWithChildren
                          href={item.href}
                          icon={item.icon}
                          label={item.title}
                          isActive={isParentActiveExact}
                          isHighlighted={isParentHighlightedState}
                          isExpanded={isExpanded}
                          hasChildren={hasChildren}
                          isCollapsed={isCollapsed && !isMobile}
                          isMobile={isMobile}
                          onToggle={() => toggleExpanded(item.href)}
                        />

                        {/* Children Items */}
                        {hasChildren && (!isCollapsed || isMobile) && isExpanded && (
                          <div className="ml-2 pl-6 border-l-2 border-sidebar-accent/30 space-y-0.5 mt-0.5">
                            {item.children!.map((child) => {
                              const isChildActive = isRouteActive(child.href, true)
                              return (
                                <NavLink
                                  key={child.href}
                                  href={child.href}
                                  icon={child.icon}
                                  label={child.title}
                                  isActive={isChildActive}
                                  isCollapsed={false}
                                  isMobile={isMobile}
                                  isChild={true}
                                  onClick={handleNavClick}
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {/* Audit */}
              {showAudit && (
                <>
                  <Separator className="my-4" />
                  {(!isCollapsed || isMobile) && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Audit
                    </p>
                  )}
                  <NavLink
                    href={auditNavItem.href}
                    icon={auditNavItem.icon}
                    label={auditNavItem.title}
                    isActive={isRouteActive(auditNavItem.href)}
                    isCollapsed={isCollapsed && !isMobile}
                    isMobile={isMobile}
                    onClick={handleNavClick}
                  />
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
                    isActive={isRouteActive(sandboxNavItem.href)}
                    isCollapsed={isCollapsed && !isMobile}
                    isMobile={isMobile}
                    onClick={handleNavClick}
                  />
                </>
              )}
            </div>
          </TooltipProvider>
        </nav>

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
              <LogoutDialog callbackUrl="/auth/super-admin/login">
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </LogoutDialog>
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
  isCollapsed: boolean
  isMobile: boolean
  onClick?: () => void
  isChild?: boolean
}

export function NavLink({ href, icon: Icon, label, badge, isActive, isCollapsed, isMobile, onClick, isChild }: NavLinkProps) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        'nav-item',
        isChild ? 'nav-item-child' : '',
        isActive ? (isChild ? 'nav-item-child-active' : 'nav-item-active') : (isChild ? 'nav-item-child-inactive' : 'nav-item-inactive'),
        isCollapsed && 'justify-center px-2'
      )}
      onClick={onClick}
    >
      <Icon className={cn('flex-shrink-0', isChild ? 'w-4 h-4' : 'w-5 h-5')} />
      {(!isCollapsed || isMobile) && <span className={cn(isChild && 'text-sm')}>{label}</span>}
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

interface NavLinkWithChildrenProps {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
  isHighlighted?: boolean
  isExpanded: boolean
  hasChildren: boolean
  isCollapsed: boolean
  isMobile: boolean
  onToggle: () => void
}

export function NavLinkWithChildren({
  href,
  icon: Icon,
  label,
  isActive,
  isHighlighted = false,
  isExpanded,
  hasChildren,
  isCollapsed,
  isMobile,
  onToggle,
}: NavLinkWithChildrenProps) {
  const handleChevronClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  const handleLinkClick = () => {
    // Auto-expand when parent link is clicked if not already expanded
    if (hasChildren && !isExpanded) {
      onToggle()
    }
  }

  const linkContent = (
    <div
      className={cn(
        'nav-item relative',
        isActive ? 'nav-item-active' : isHighlighted ? 'nav-item-highlighted' : 'nav-item-inactive',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Link href={href} className="flex items-center gap-3 flex-1" onClick={handleLinkClick}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {(!isCollapsed || isMobile) && <span className="flex-1">{label}</span>}
      </Link>
      {hasChildren && (!isCollapsed || isMobile) && (
        <button
          onClick={handleChevronClick}
          className={cn(
            'p-1 rounded hover:bg-sidebar-accent/50 transition-colors ml-auto',
            (isActive || isHighlighted) && 'text-primary-foreground'
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          type="button"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
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
