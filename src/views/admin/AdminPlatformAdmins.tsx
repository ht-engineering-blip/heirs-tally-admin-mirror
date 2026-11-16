'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Column, DataTable } from '@/components/shared/DataTable'
import { createPlatformAdminAccountsApi } from '@/lib/api/platform-admin-accounts-api'
import type { PlatformAdminSummary } from '@/types/platform-admin'
import { Loader2, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const api = createPlatformAdminAccountsApi()

type PlatformAdminRow = PlatformAdminSummary & { id: string }

// The only module that exists today (see docs/platform-admin-and-monitoring-api-contract.md §1)
// — additive by design, so a newly granted module just needs a new entry here.
const AVAILABLE_MODULES: { value: string; label: string }[] = [
  { value: 'monitoring', label: 'Monitoring dashboard' },
]

const PAGE_SIZE = 20

interface FormState {
  email: string
  firstName: string
  lastName: string
  password: string
  status: 'active' | 'suspended'
  modulePermissions: string[]
}

const EMPTY_FORM: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  status: 'active',
  modulePermissions: [],
}

export default function AdminPlatformAdmins() {
  const [items, setItems] = useState<PlatformAdminRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformAdminRow | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.list(page, PAGE_SIZE)
      setItems(res.data.items.map((account) => ({ ...account, id: account.userId })))
      setTotal(res.data.total)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load platform admin accounts')
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => { fetchList() }, [fetchList])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (account: PlatformAdminRow) => {
    setEditing(account)
    setForm({
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      password: '',
      status: account.status,
      modulePermissions: account.modulePermissions,
    })
    setDialogOpen(true)
  }

  const toggleModule = (module: string) => {
    setForm((prev) => ({
      ...prev,
      modulePermissions: prev.modulePermissions.includes(module)
        ? prev.modulePermissions.filter((m) => m !== module)
        : [...prev.modulePermissions, module],
    }))
  }

  // Dirty-check: an edit has nothing to save until a field actually differs
  // from the account as loaded.
  const isDirty = editing
    ? form.firstName !== editing.firstName ||
      form.lastName !== editing.lastName ||
      form.status !== editing.status ||
      !!form.password ||
      form.modulePermissions.length !== editing.modulePermissions.length ||
      form.modulePermissions.some((m) => !editing.modulePermissions.includes(m))
    : true

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (editing) {
        await api.update(editing.userId, {
          firstName: form.firstName,
          lastName: form.lastName,
          status: form.status,
          modulePermissions: form.modulePermissions,
          ...(form.password ? { password: form.password } : {}),
        })
        toast.success('Account updated')
      } else {
        if (form.password.length < 12) {
          toast.error('Password must be at least 12 characters')
          setIsSaving(false)
          return
        }
        await api.create({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
          modulePermissions: form.modulePermissions,
        })
        toast.success('Account created')
      }
      setDialogOpen(false)
      fetchList()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save account')
    } finally {
      setIsSaving(false)
    }
  }

  const columns: Column<PlatformAdminRow>[] = [
    {
      key: 'name',
      header: 'Name',
      accessor: (account) => (
        <div>
          <p className="font-medium">{account.firstName} {account.lastName}</p>
          <p className="text-xs text-muted-foreground">{account.email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (account) => (
        <Badge className={account.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
          {account.status}
        </Badge>
      ),
    },
    {
      key: 'modulePermissions',
      header: 'Modules',
      accessor: (account) => (
        <div className="flex flex-wrap gap-1">
          {account.modulePermissions.length === 0
            ? <span className="text-xs text-muted-foreground">None</span>
            : account.modulePermissions.map((m) => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      accessor: (account) => account.lastLoginAt
        ? format(new Date(account.lastLoginAt), 'MMM d, yyyy HH:mm')
        : <span className="text-muted-foreground">Never</span>,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Admins</h1>
          <p className="page-subtitle">
            Accounts that can sign in to module-scoped dashboards (currently just Monitoring) — gated by the shared admin key, not a user role.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          New account
        </Button>
      </div>

      <DataTable
        data={items}
        columns={columns}
        searchPlaceholder="Search accounts by name or email..."
        isLoading={isLoading}
        currentPage={page}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        onRowClick={openEdit}
        emptyMessage="No platform admin accounts yet"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit account' : 'New platform admin account'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Leave password blank to keep it unchanged.' : 'Password must be at least 12 characters.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{editing ? 'New password (optional)' : 'Password'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {editing && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v: 'active' | 'suspended') => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Module access</Label>
              <div className="space-y-2">
                {AVAILABLE_MODULES.map((module) => (
                  <label key={module.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.modulePermissions.includes(module.value)}
                      onCheckedChange={() => toggleModule(module.value)}
                    />
                    {module.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty || !form.firstName || !form.lastName || (!editing && (!form.email || !form.password))}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save changes' : 'Create account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
