'use client'

import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ErpSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  includeCustom?: boolean
  includeStandards?: boolean
  disabled?: boolean
  className?: string
}

export function ErpSelect({
  value,
  onValueChange,
  placeholder = 'Select ERP system',
  includeCustom = true,
  includeStandards = true,
  disabled = false,
  className,
}: ErpSelectProps) {
  const { erpOptions, isLoading, error, refetch } = useSupportedErps({ includeAll: true })

  if (isLoading) {
    return <Skeleton className={`h-10 w-full ${className ?? ''}`} />
  }

  if (error || erpOptions.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ''}`}>
        <span className="text-sm text-muted-foreground">
          {error ? 'Failed to load ERPs' : 'No ERPs available'}
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  const filteredOptions = erpOptions.filter((erp) => {
    if (!includeCustom && erp === 'CUSTOM') return false
    if (!includeStandards && (erp.includes('UBL') || erp.includes('PEPPOL'))) return false
    return true
  })

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredOptions.map((erp) => (
          <SelectItem key={erp} value={erp}>
            {formatErpName(erp)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
