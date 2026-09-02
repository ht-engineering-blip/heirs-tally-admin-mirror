'use client'

import { Settings, LogOut, User, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { LogoutDialog } from '@/components/shared/LogoutDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/use-session'
import { useTenant } from '@/hooks/use-tenant'
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher'

interface HeaderProps {
  isMobile?: boolean
  onMenuClick?: () => void
  onCollapse?: () => void
  isCollapsed?: boolean
  logoutCallbackUrl?: string
}

export function Header({ isMobile = false, onMenuClick, isCollapsed, onCollapse, logoutCallbackUrl = '/auth/login' }: HeaderProps) {
  const { user } = useSession()
  // NextAuth's JWT session only captures name/email once, at login — it never
  // refreshes after a profile edit or email change. useTenant() fetches /me
  // live, so prefer that for display and only fall back to the session
  // (e.g. for admins, whose useTenant() query is disabled entirely).
  const { tenantData } = useTenant()
  const liveData = tenantData as Record<string, any> | undefined
  const displayName =
    (liveData && 'businessName' in liveData && liveData.businessName) ||
    (liveData && 'firstName' in liveData && 'lastName' in liveData && `${liveData.firstName} ${liveData.lastName}`) ||
    user?.name ||
    'Admin'
  const displayEmail =
    (liveData && 'contactEmail' in liveData && liveData.contactEmail) ||
    (liveData && 'email' in liveData && liveData.email) ||
    user?.email

  return (
    <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-card">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Left side - hamburger menu on mobile, empty on desktop */}
        <div className="flex items-center gap-4">
           {/* Collapse button - hidden on mobile */}
           {!isMobile && (
            <div className="absolute  left-0 z-50 shrink-0 ">
              <Button
                variant="ghost"
                size="sm"
                onClick={()=>onCollapse()}
                className="w-full justify-center"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
          {isMobile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-foreground">Heirs E-Invoicing</h1>
                <p className="text-xs text-muted-foreground">Admin Tenant</p>
              </div>
            </>
          )}
        </div>

        {/* Right side - theme, notifications and profile */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <ThemeSwitcher variant="icon" size="icon" />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {displayName?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {displayEmail || user?.role?.replace('_', ' ').toLowerCase() || 'Admin'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/settings/api-keys">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <LogoutDialog callbackUrl={logoutCallbackUrl}>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </LogoutDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
