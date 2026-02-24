'use client'

import { useSupportedErps } from '@/hooks/use-supported-erps'
import { Skeleton } from '@/components/ui/skeleton'
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
  const { erpOptions, isLoading } = useSupportedErps({ includeAll: true, includeFallback: true })

  if (isLoading) {
    return <Skeleton className={`h-10 w-full ${className ?? ''}`} />
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
            {erp}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
