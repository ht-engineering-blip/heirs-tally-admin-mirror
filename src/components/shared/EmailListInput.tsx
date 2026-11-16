'use client'

import { useState, type KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailListInputProps {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  disabled?: boolean
  placeholder?: string
  className?: string
}

/** Chip-style multi-email input: type an address, press Enter/comma/Tab (or
 * blur) to add it as a chip, click the x to remove one. Rejects duplicates,
 * malformed addresses, and anything past `max`. */
export function EmailListInput({
  value,
  onChange,
  max,
  disabled = false,
  placeholder = 'Enter an email and press Enter',
  className,
}: EmailListInputProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const commit = () => {
    const email = draft.trim().replace(/,$/, '')
    if (!email) return
    if (!EMAIL_RE.test(email)) {
      setError(`"${email}" isn't a valid email address`)
      return
    }
    if (value.some((v) => v.toLowerCase() === email.toLowerCase())) {
      setError('That email is already in the list')
      setDraft('')
      return
    }
    if (max && value.length >= max) {
      setError(`You can add up to ${max} recipients`)
      return
    }
    onChange([...value, email])
    setDraft('')
    setError(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (draft.trim()) {
        e.preventDefault()
        commit()
      }
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const remove = (email: string) => onChange(value.filter((v) => v !== email))

  return (
    <div className={cn('space-y-2', className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1 pr-1 font-normal">
              {email}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(email)}
                  className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${email}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (!max || value.length < max) && (
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={placeholder}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {max && (
        <p className="text-xs text-muted-foreground">{value.length} / {max} recipients</p>
      )}
    </div>
  )
}
