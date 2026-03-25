'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Key,
  AlertCircle,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'

interface ApiKey { 
  id: string
  keyId: string
  keyName: string
  keyPrefix: string
  status: string
  scopes: string[]
  createdAt: string | Date
  expiresAt?: string | Date
  lastUsedAt?: string | Date
  usageCount: number
}

const apiKeyFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'revoked', label: 'Revoked' },
      { value: 'expired', label: 'Expired' },
    ],
  },
]

export default function ApiKeysPage() {
  const { tenantId } = useTenant()
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission('api-keys:create')
  const canRotate = hasPermission('api-keys:rotate')
  const canRevoke = hasPermission('api-keys:revoke')

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRotateDialog, setShowRotateDialog] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showKeyDisplayModal, setShowKeyDisplayModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState('')

  // Create form
  const [formData, setFormData] = useState({
    name: '',
    expiresInDays: 365,
  })

  const resetForm = () => {
    setFormData({ name: '', expiresInDays: 365 })
  }

  const fetchApiKeys = async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const api = createTenantApi()
      const response = await api.getApiKeys(tenantId)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to fetch API keys')
      } else if (response.data?.data?.data) {
        console.log("=================", response.data.data)
        const raw = response.data.data;
        let {data, meta} = raw
        const pagination = meta

        let keys: ApiKey[] = data.map((k: any) => ({
          id: k.keyId || k.id || k._id,
          keyId: k.keyId || k.id,
          keyName: k.keyName || k.name,
          keyPrefix: k.keyPrefix,
          status: k.status,
          scopes: k.scopes || [],
          createdAt: k.createdAt,
          expiresAt: k.expiresAt,
          lastUsedAt: k.lastUsedAt,
          usageCount: k.usageCount || 0,
        }))

        // Client-side filters
        if (filters.status && filters.status !== 'all') {
          keys = keys.filter((k) => k.status?.toLowerCase() === filters.status)
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          keys = keys.filter(
            (k) =>
              k.keyName?.toLowerCase().includes(q) ||
              k.keyPrefix?.toLowerCase().includes(q)
          )
        }

        setApiKeys(keys)
        setTotal(pagination?.total || keys.length)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) fetchApiKeys()
  }, [tenantId, page, searchQuery, filters])

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a name for the API key')
      return
    }

    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.createApiKey(tenantId!, {
        name: formData.name,
        expiresInDays: formData.expiresInDays || undefined,
      })

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to create API key')
      } else if (response.data?.data) {
        const keyData = response.data.data as any
        if (keyData.key) {
          setNewlyCreatedKey(keyData.key)
          setShowKeyDisplayModal(true)
        }
        toast.success('API key created successfully')
        setShowCreateModal(false)
        resetForm()
        fetchApiKeys()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create API key')
    } finally {
      setSaving(false)
    }
  }

  const handleRotate = async () => {
    if (!selectedKey) return

    setSaving(true)
    try {
      const api = createTenantApi()
      console.log("============", tenantId!,  selectedKey, 'Key rotated by admin')
      const response = await api.rotateApiKey(tenantId!,  selectedKey.keyId || selectedKey.id || '', {
        reason: 'Key rotation requested',
      })

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to rotate API key')
      } else if (response.data?.data) {
        const keyData = response.data.data as any
        if (keyData.key) {
          setNewlyCreatedKey(keyData.key)
          setShowKeyDisplayModal(true)
        }
        toast.success('API key rotated successfully')
        setShowRotateDialog(false)
        setSelectedKey(null)
        fetchApiKeys()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to rotate API key')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!selectedKey) return

    setSaving(true)
    try {
      const api = createTenantApi()
      
      const response = await api.revokeApiKey(tenantId!, selectedKey.keyId, 'Key revoked by admin')

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to revoke API key')
      } else {
        toast.success('API key revoked successfully')
        setShowRevokeDialog(false)
        setSelectedKey(null)
        fetchApiKeys()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke API key')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const columns: Column<ApiKey>[] = [
    {
      key: 'keyName',
      header: 'Name',
      sortable: true,
      accessor: (key) => <span className="font-medium">{key.keyName || 'Unnamed'}</span>,
    },
    {
      key: 'keyPrefix',
      header: 'API Key',
      accessor: (key) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
            {key.keyPrefix}****
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleCopy(`${key.keyPrefix}****`)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (key) => <StatusBadge status={key.status} />,
    },
    {
      key: 'usageCount',
      header: 'API Calls',
      sortable: true,
      accessor: (key) => (
        <span className="font-medium">{(key.usageCount || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      sortable: true,
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {key.lastUsedAt
            ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {new Date(key.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...apiKeys].sort((a, b) => {
      let aVal: any = a[key as keyof ApiKey]
      let bVal: any = b[key as keyof ApiKey]

      if (key === 'lastUsedAt' || key === 'expiresAt' || key === 'createdAt') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      } else if (key === 'usageCount') {
        aVal = Number(aVal || 0)
        bVal = Number(bVal || 0)
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
    setApiKeys(sorted)
  }

  const rowActions = (key: ApiKey) => (
    <>
      {canRotate && key.status?.toLowerCase() === 'active' && (
        <DropdownMenuItem
          onClick={() => {
            setSelectedKey(key)
            setShowRotateDialog(true)
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Rotate Key
        </DropdownMenuItem>
      )}
      {canRevoke && key.status?.toLowerCase() === 'active' && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              setSelectedKey(key)
              setShowRevokeDialog(true)
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Key
          </DropdownMenuItem>
        </>
      )}
    </>
  )

  const stats = {
    total: apiKeys.length,
    active: apiKeys.filter((k) => k.status?.toLowerCase() === 'active').length,
    revoked: apiKeys.filter((k) => k.status?.toLowerCase() === 'revoked').length,
    expired: apiKeys.filter((k) => k.status?.toLowerCase() === 'expired').length,
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">API Keys</h1>
            <p className="text-sm text-muted-foreground">
              Manage your API keys for programmatic access
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowCreateModal(true)} className="rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Keys</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.revoked}</p>
                  <p className="text-sm text-muted-foreground">Revoked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Key className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              API Key Security
            </CardTitle>
            <CardDescription>
              API keys provide programmatic access to the e-invoicing platform. Rotate keys regularly and
              never share them publicly. Keys can be revoked immediately if compromised.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Table */}
        <DataTable
          data={apiKeys}
          columns={columns}
          searchPlaceholder="Search by key name..."
          filters={apiKeyFilters}
          rowActions={rowActions}
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No API keys found. Create one to get started."
        />
      </div>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key. The key will be shown only once after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name *</Label>
              <Input
                id="key-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production API Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-expiry">Expires In (Days)</Label>
              <Input
                id="key-expiry"
                type="number"
                min={1}
                max={3650}
                value={formData.expiresInDays}
                onChange={(e) =>
                  setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 365 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Default: 365 days. Set to 0 for no expiration.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.name}>
              {saving ? 'Creating...' : 'Create API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Display New Key Modal */}
      <Dialog open={showKeyDisplayModal} onOpenChange={setShowKeyDisplayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now — you won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                  {newlyCreatedKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(newlyCreatedKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Important</p>
                <p className="text-muted-foreground">
                  This is the only time you'll see the full API key. Store it securely.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowKeyDisplayModal(false)
                setNewlyCreatedKey('')
              }}
            >
              I've Copied the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rotate <strong>{selectedKey?.keyName}</strong>? The old key
              will be invalidated immediately and a new key will be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedKey(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRotate}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={saving}
            >
              {saving ? 'Rotating...' : 'Rotate Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke <strong>{selectedKey?.keyName}</strong>? This action
              cannot be undone and the key will immediately stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedKey(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
