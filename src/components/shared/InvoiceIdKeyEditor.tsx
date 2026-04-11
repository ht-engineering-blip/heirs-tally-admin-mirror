'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface InvoiceIdKeyEditorProps {
  initialValue?: string
  /** Called with the new key value; throw to signal failure. */
  onSave: (key: string) => Promise<void>
  onSaved?: (key: string) => void
  disabled?: boolean
}

export function InvoiceIdKeyEditor({
  initialValue = '',
  onSave,
  onSaved,
  disabled,
}: InvoiceIdKeyEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(value)
      toast.success('Invoice ID key updated')
      onSaved?.(value)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update invoice ID key')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = value !== (initialValue ?? '')

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Invoice ID Key</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. invoice.documentId"
          className="font-mono text-xs"
          disabled={disabled}
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || disabled || !isDirty}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Dot-notation path to the invoice ID field in the webhook payload
      </p>
    </div>
  )
}
