'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { InvoiceIdKeyEditor } from './InvoiceIdKeyEditor'
import { Skeleton } from '@/components/ui/skeleton'
import type { InvoiceKeyType, KeyConfigEntry } from '@/types/invoice-key-config'

/** Mirrors one InvoiceIdKeyEditor's shape: label, input+button row, help text. */
function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-16" />
      </div>
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

type KeyConfigResponse = { error?: any; data?: { data?: KeyConfigEntry } }

interface InvoiceKeyConfigSectionProps {
  tenantId: string
  keyType: InvoiceKeyType
  title: string
  idKeyPlaceholder?: string
  idKeyHelpText?: string
  hasReferenceKey?: boolean
  referenceKeyPlaceholder?: string
  referenceKeyHelpText?: string
  disabled?: boolean
  fetchConfig: (tenantId: string, keyType: InvoiceKeyType) => Promise<KeyConfigResponse>
  saveConfig: (
    tenantId: string,
    payload: { keyType: InvoiceKeyType; idKey: string; referenceIdKey?: string }
  ) => Promise<KeyConfigResponse>
  className?: string
}

/**
 * One document type's key-config section — fetches and saves itself
 * independently of every other section on the page (its own loading state,
 * its own save calls), so editing one type never disrupts the others.
 */
export function InvoiceKeyConfigSection({
  tenantId,
  keyType,
  title,
  idKeyPlaceholder,
  idKeyHelpText,
  hasReferenceKey,
  referenceKeyPlaceholder,
  referenceKeyHelpText,
  disabled,
  fetchConfig,
  saveConfig,
  className = 'space-y-3',
}: InvoiceKeyConfigSectionProps) {
  const [idKey, setIdKey] = useState('')
  const [referenceIdKey, setReferenceIdKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchConfig(tenantId, keyType)
        if (cancelled) return
        if (res.error) {
          toast.error((res.error as any)?.value?.error || `Failed to load ${title} key configuration`)
        } else if (res.data?.data) {
          setIdKey(res.data.data.idKey || '')
          setReferenceIdKey(res.data.data.referenceIdKey || '')
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || `Failed to load ${title} key configuration`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantId, keyType])

  // idKey is always required by the backend, even when only the reference
  // key changed — so every save sends both current values together.
  const save = async (nextIdKey: string, nextReferenceIdKey: string) => {
    const res = await saveConfig(tenantId, {
      keyType,
      idKey: nextIdKey,
      ...(hasReferenceKey ? { referenceIdKey: nextReferenceIdKey } : {}),
    })
    if (res.error) {
      throw new Error((res.error as any)?.value?.error || `Failed to update ${title} key configuration`)
    }
    if (res.data?.data) {
      setIdKey(res.data.data.idKey || '')
      setReferenceIdKey(res.data.data.referenceIdKey || '')
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <p className="text-sm font-medium">{title}</p>
        <FieldSkeleton />
        {hasReferenceKey && <FieldSkeleton />}
      </div>
    )
  }

  return (
    <div className={className}>
      <p className="text-sm font-medium">{title}</p>
      <InvoiceIdKeyEditor
        initialValue={idKey}
        placeholder={idKeyPlaceholder}
        helpText={idKeyHelpText}
        successMessage={`${title} ID key updated`}
        disabled={disabled}
        onSave={(key) => save(key, referenceIdKey)}
        onSaved={(key) => setIdKey(key)}
      />
      {hasReferenceKey && (
        <InvoiceIdKeyEditor
          initialValue={referenceIdKey}
          label="Reference ID Key"
          placeholder={referenceKeyPlaceholder}
          helpText={referenceKeyHelpText}
          successMessage={`${title} reference ID key updated`}
          disabled={disabled}
          onSave={(key) => save(idKey, key)}
          onSaved={(key) => setReferenceIdKey(key)}
        />
      )}
    </div>
  )
}
