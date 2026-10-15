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
  invoiceNumberKeyPlaceholder?: string
  invoiceNumberKeyHelpText?: string
  disabled?: boolean
  fetchConfig: (tenantId: string, keyType: InvoiceKeyType) => Promise<KeyConfigResponse>
  saveConfig: (
    tenantId: string,
    payload: { keyType: InvoiceKeyType; idKey: string; referenceIdKey?: string; invoiceNumberKey?: string }
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
  invoiceNumberKeyPlaceholder,
  invoiceNumberKeyHelpText,
  disabled,
  fetchConfig,
  saveConfig,
  className = 'space-y-3',
}: InvoiceKeyConfigSectionProps) {
  const [idKey, setIdKey] = useState('')
  const [referenceIdKey, setReferenceIdKey] = useState('')
  const [invoiceNumberKey, setInvoiceNumberKey] = useState('')
  const [loading, setLoading] = useState(true)
  // title is allowed to be empty (e.g. when a parent already renders its own
  // label right above this section) — toasts still need something readable.
  const toastTitle = title || 'this document type'

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchConfig(tenantId, keyType)
        if (cancelled) return
        if (res.error) {
          toast.error((res.error as any)?.value?.error || `Failed to load ${toastTitle} key configuration`)
        } else if (res.data?.data) {
          setIdKey(res.data.data.idKey || '')
          setReferenceIdKey(res.data.data.referenceIdKey || '')
          setInvoiceNumberKey(res.data.data.invoiceNumberKey || '')
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || `Failed to load ${toastTitle} key configuration`)
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

  // idKey is always required by the backend, even when only one of the other
  // fields changed — so every save sends all three current values together.
  const save = async (nextIdKey: string, nextReferenceIdKey: string, nextInvoiceNumberKey: string) => {
    const res = await saveConfig(tenantId, {
      keyType,
      idKey: nextIdKey,
      ...(hasReferenceKey ? { referenceIdKey: nextReferenceIdKey } : {}),
      invoiceNumberKey: nextInvoiceNumberKey,
    })
    if (res.error) {
      throw new Error((res.error as any)?.value?.error || `Failed to update ${toastTitle} key configuration`)
    }
    if (res.data?.data) {
      setIdKey(res.data.data.idKey || '')
      setReferenceIdKey(res.data.data.referenceIdKey || '')
      setInvoiceNumberKey(res.data.data.invoiceNumberKey || '')
    }
  }

  if (loading) {
    return (
      <div className={className}>
        {title && <p className="text-sm font-medium">{title}</p>}
        <FieldSkeleton />
        {hasReferenceKey && <FieldSkeleton />}
        <FieldSkeleton />
      </div>
    )
  }

  return (
    <div className={className}>
      {title && <p className="text-sm font-medium">{title}</p>}
      <InvoiceIdKeyEditor
        initialValue={idKey}
        placeholder={idKeyPlaceholder}
        helpText={idKeyHelpText}
        successMessage={`${toastTitle} ID key updated`}
        disabled={disabled}
        onSave={(key) => save(key, referenceIdKey, invoiceNumberKey)}
        onSaved={(key) => setIdKey(key)}
      />
      {hasReferenceKey && (
        <InvoiceIdKeyEditor
          initialValue={referenceIdKey}
          label="Reference ID Key"
          placeholder={referenceKeyPlaceholder}
          helpText={referenceKeyHelpText}
          successMessage={`${toastTitle} reference ID key updated`}
          disabled={disabled}
          onSave={(key) => save(idKey, key, invoiceNumberKey)}
          onSaved={(key) => setReferenceIdKey(key)}
        />
      )}
      <InvoiceIdKeyEditor
        initialValue={invoiceNumberKey}
        label="Invoice Number Key"
        placeholder={invoiceNumberKeyPlaceholder}
        helpText={
          invoiceNumberKeyHelpText ||
          'Dot-notation path to the human-readable invoice number in the webhook payload — takes priority over the AI-learned mapping template'
        }
        successMessage={`${toastTitle} invoice number key updated`}
        disabled={disabled}
        onSave={(key) => save(idKey, referenceIdKey, key)}
        onSaved={(key) => setInvoiceNumberKey(key)}
      />
    </div>
  )
}
