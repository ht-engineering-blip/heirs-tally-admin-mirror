'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeSwitcherProps {
  /**
   * Variant of the theme switcher
   * - "sidebar": For sidebar use with full width button
   * - "icon": Icon-only button (default)
   */
  variant?: 'sidebar' | 'icon'
  /**
   * Show label text next to icon
   */
  showLabel?: boolean
  /**
   * Show tooltip when collapsed/hovered (for sidebar variant)
   */
  showTooltip?: boolean
  /**
   * Additional className for the button
   */
  className?: string
  /**
   * Size of the button
   */
  size?: 'sm' | 'icon' | 'default' | 'lg'
}

export function ThemeSwitcher({
  variant = 'icon',
  showLabel = false,
  showTooltip = false,
  className,
  size = 'icon',
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Always use Sun as fallback during SSR to avoid hydration mismatch
  const ThemeIcon = !mounted ? Sun : theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  const buttonContent = (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        variant === 'sidebar' && 'w-full justify-start',
        variant === 'icon' && 'h-9 w-9 hover:bg-accent',
        className
      )}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      <ThemeIcon className="w-4 h-4" />
      {showLabel && <span className="ml-2">Theme</span>}
    </Button>
  )

  const dropdownContent = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {buttonContent}
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <p>Theme</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          buttonContent
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span>System</span>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // For sidebar collapsed state with tooltip, we need special handling
  if (showTooltip && variant === 'sidebar') {
    return (
      <TooltipProvider>
        <Tooltip>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('w-full justify-center px-2', className)}
                  suppressHydrationWarning
                >
                  <ThemeIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p>Theme</p>
            </TooltipContent>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </div>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </div>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span>System</span>
                  </div>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return dropdownContent
}
