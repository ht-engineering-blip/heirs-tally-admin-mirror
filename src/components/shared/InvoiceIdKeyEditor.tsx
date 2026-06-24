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
  label?: string
  placeholder?: string
  helpText?: string
  successMessage?: string
}

export function InvoiceIdKeyEditor({
  initialValue = '',
  onSave,
  onSaved,
  disabled,
  label = 'Invoice ID Key',
  placeholder = 'e.g. invoice.documentId',
  helpText = 'Dot-notation path to the invoice ID field in the webhook payload',
  successMessage = 'Invoice ID key updated',
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
      toast.success(successMessage)
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
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
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
        {helpText}
      </p>
    </div>
  )
}
