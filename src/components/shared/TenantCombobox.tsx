'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getAdminApiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { AlertCircle, Check, ChevronsUpDown, RefreshCw } from 'lucide-react'

interface TenantOption {
  tenantId: string
  businessName: string
}

interface TenantComboboxProps {
  value: string
  onChange: (tenantId: string) => void
  placeholder?: string
  className?: string
}

/** Searchable tenant picker backed by live server-side search (api.v1.tenants.get
 * with a `search` query param, same endpoint Tenants.tsx uses) — the tenant list
 * can be large, so this never tries to load it all client-side. Empty value ("")
 * means "All tenants". */
export function TenantCombobox({ value, onChange, placeholder = 'All tenants', className }: TenantComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<TenantOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Caches tenantId -> businessName for labels we've seen (search results, or
  // the initially-selected tenant from a URL param) so the trigger can show a
  // name instead of a raw ID without needing a dedicated "get tenant by id" call.
  const labelCache = useRef<Map<string, string>>(new Map())
  const [, forceRender] = useState(0)

  const fetchTenants = async (search: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const api = getAdminApiClient()
      const response = await api.v1.tenants.get({
        query: { page: 1, limit: 20, ...(search ? { search } : {}) } as any,
      })
      if (response.error) {
        setError((response.error as any)?.value?.error || 'Failed to load tenants')
        setOptions([])
      } else {
        const results: TenantOption[] = ((response.data as any)?.data || []).map((t: any) => ({
          tenantId: String(t.tenantId ?? t.id ?? ''),
          businessName: t.businessName || String(t.tenantId ?? t.id ?? ''),
        }))
        results.forEach((t) => labelCache.current.set(t.tenantId, t.businessName))
        setOptions(results)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load tenants')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => fetchTenants(query), query ? 300 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query])

  // If we land with a tenantId already set (e.g. from a URL param) and don't
  // have its name cached yet, fetch it once so the trigger shows a name.
  useEffect(() => {
    if (value && !labelCache.current.has(value)) {
      ;(async () => {
        try {
          const api = getAdminApiClient()
          const response = await api.v1.tenants.get({ query: { page: 1, limit: 1, search: value } as any })
          const match = ((response.data as any)?.data || []).find((t: any) => String(t.tenantId) === value)
          if (match) {
            labelCache.current.set(value, match.businessName || value)
            forceRender((n) => n + 1)
          }
        } catch {
          // Non-fatal — the trigger falls back to showing the raw tenantId.
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const selectedLabel = value ? labelCache.current.get(value) || value : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal h-10', className)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search tenants..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-[220px]">
            <CommandEmpty>
              {error ? (
                <div className="flex flex-col items-center gap-2 py-4 px-2 text-center">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => fetchTenants(query)}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                  </Button>
                </div>
              ) : (
                <span className="py-2 block text-center">
                  {isLoading ? 'Searching…' : 'No tenants found.'}
                </span>
              )}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                All tenants
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.tenantId}
                  value={option.tenantId}
                  onSelect={() => {
                    onChange(option.tenantId)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === option.tenantId ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{option.businessName}</span>
                    <p className="text-xs text-muted-foreground truncate font-mono">{option.tenantId}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
