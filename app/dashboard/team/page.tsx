'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Plus,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Pencil,
  Ban,
  UserCheck,
} from 'lucide-react'
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
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
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions, BUSINESS_TEAM_MEMBER_PERMISSIONS, MEMBER_ROLES } from '@/hooks/use-permissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'

interface TeamMember {
  id: string
  email: string
  status: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
  invitedAt: string | Date
  lastLoginAt?: string | Date
}

const teamFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'invited', label: 'Invited' },
      { value: 'suspended', label: 'Suspended' },
    ],
  },
  {
    key: 'role',
    label: 'Role',
    options: [
      { value: 'all', label: 'All Roles' },
      { value: 'admin', label: 'Admin' },
      { value: 'member', label: 'Member' },
      { value: 'viewer', label: 'Viewer' },
    ],
  },
]

const PERMISSION_LIST = BUSINESS_TEAM_MEMBER_PERMISSIONS.map((p) => ({
  value: p,
  label: p.replace(':', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}))

const ROLES_OPTIONS = Object.values(MEMBER_ROLES)

export default function TeamPage() {
  const router = useRouter()
  const { tenantId } = useTenant()
  const { hasPermission } = usePermissions()

  const canInvite = hasPermission('team:invite')
  const canUpdate = hasPermission('team:update')
  const canRemove = hasPermission('team:remove')

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showResendDialog, setShowResendDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: '' as string,
    permissions: [] as string[],
  })

  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: '' as string,
    status: '' as string,
    permissions: [] as string[],
  })

  const resetInviteForm = () => {
    setInviteForm({ email: '', firstName: '', lastName: '', role: '', permissions: [] })
  }

  const fetchTeam = async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const api = createTenantApi()
      const query: Record<string, string> = {
        page: page.toString(),
        limit: '50',
      }
      if (filters.status && filters.status !== 'all') query.status = filters.status
      if (filters.role && filters.role !== 'all') query.role = filters.role

      const response = await api.getTeamMembers(tenantId, query)

      if (response.data?.data) {
        const raw = response.data.data as any[]
        let members: TeamMember[] = raw.map((m) => ({
          ...m,
          id: m.userId || m.id,
        }))
        const pagination = (response.data as any).pagination

        // Client-side search filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          members = members.filter(
            (m) =>
              m.firstName?.toLowerCase().includes(q) ||
              m.lastName?.toLowerCase().includes(q) ||
              m.email?.toLowerCase().includes(q)
          )
        }

        setTeamMembers(members)
        setTotal(pagination?.total || members.length)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) fetchTeam()
  }, [page, searchQuery, filters, tenantId])

  const handleInvite = async () => {
    if (!inviteForm.firstName || !inviteForm.email || !inviteForm.role) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.inviteTeamMember(tenantId!, {
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        role: inviteForm.role,
        permissions: inviteForm.permissions.length > 0 ? inviteForm.permissions : undefined,
      })

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to invite team member')
      } else {
        toast.success('Team member invited successfully')
        setShowInviteModal(false)
        resetInviteForm()
        fetchTeam()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to invite team member')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedMember) return

    setSaving(true)
    try {
      const api = createTenantApi()
      const data: any = {}
      if (editForm.firstName) data.firstName = editForm.firstName
      if (editForm.lastName) data.lastName = editForm.lastName
      if (editForm.role) data.role = editForm.role
      if (editForm.status) data.status = editForm.status
      if (editForm.permissions.length > 0) data.permissions = editForm.permissions

      const response = await api.updateTeamMember(tenantId!, selectedMember.id, data)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to update team member')
      } else {
        toast.success('Team member updated successfully')
        setShowEditModal(false)
        setSelectedMember(null)
        fetchTeam()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update team member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedMember) return

    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.removeTeamMember(tenantId!, selectedMember.id)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to remove team member')
      } else {
        toast.success('Team member removed successfully')
        setShowRemoveDialog(false)
        setSelectedMember(null)
        fetchTeam()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove team member')
    } finally {
      setSaving(false)
    }
  }

  const handleResendInvite = async () => {
    if (!selectedMember) return

    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.resendInvite(tenantId!, selectedMember.id)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to resend invite')
      } else {
        toast.success('Invite resent successfully')
        setShowResendDialog(false)
        setSelectedMember(null)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend invite')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status?.toLowerCase() === 'active' ? 'suspended' : 'active'
    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.updateTeamMember(tenantId!, member.id, {
        status: newStatus as 'active' | 'suspended',
      })

      if (response.error) {
        toast.error((response.error as any)?.value?.error || `Failed to ${newStatus === 'suspended' ? 'suspend' : 'activate'} member`)
      } else {
        toast.success(`Team member ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`)
        fetchTeam()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update member status')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (member: TeamMember) => {
    setSelectedMember(member)
    setEditForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      role: member.role || '',
      status: member.status || '',
      permissions: member.permissions || [],
    })
    setShowEditModal(true)
  }

  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      accessor: (member) => (
        <div>
          <p className="font-medium">{`${member.firstName} ${member.lastName || ''}`}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: (member) => (
        <span className="capitalize font-medium text-sm">{member.role || 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'invitedAt',
      header: 'Invited',
      sortable: true,
      accessor: (member) => (
        <div className="text-sm">
          <p className="text-muted-foreground">
            {member.invitedAt
              ? formatDistanceToNow(new Date(member.invitedAt), { addSuffix: true })
              : 'N/A'}
          </p>
          {member.invitedAt && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(member.invitedAt), 'MMM dd, yyyy')}
            </p>
          )}
        </div>
      ),
    },
  ]

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...teamMembers].sort((a, b) => {
      let aVal: any = a[key as keyof TeamMember]
      let bVal: any = b[key as keyof TeamMember]

      if (key === 'name') {
        aVal = `${a.firstName} ${a.lastName}`.toLowerCase()
        bVal = `${b.firstName} ${b.lastName}`.toLowerCase()
      } else if (key === 'invitedAt') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
    setTeamMembers(sorted)
  }

  const rowActions = (member: TeamMember) => {
    const isInvited = member.status?.toLowerCase() === 'invited'
    const isActive = member.status?.toLowerCase() === 'active'

    return (
      <>
        <DropdownMenuItem onClick={() => router.push(`/dashboard/team/${member.id}`)}>
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </DropdownMenuItem>

        {canUpdate && (
          <DropdownMenuItem onClick={() => openEditModal(member)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Member
          </DropdownMenuItem>
        )}

        {canUpdate && isInvited && (
          <DropdownMenuItem
            onClick={() => {
              setSelectedMember(member)
              setShowResendDialog(true)
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Resend Invite
          </DropdownMenuItem>
        )}

        {canUpdate && !isInvited && (
          <DropdownMenuItem onClick={() => handleToggleStatus(member)}>
            {isActive ? (
              <>
                <Ban className="w-4 h-4 mr-2" />
                Suspend
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Activate
              </>
            )}
          </DropdownMenuItem>
        )}

        {canRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedMember(member)
                setShowRemoveDialog(true)
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter((m) => m.status?.toLowerCase() === 'active').length,
    invited: teamMembers.filter((m) => m.status?.toLowerCase() === 'invited').length,
    suspended: teamMembers.filter((m) => m.status?.toLowerCase() === 'suspended').length,
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Team</h1>
            <p className="text-sm text-muted-foreground">Manage your team members and their access</p>
          </div>
          {canInvite && (
            <Button onClick={() => setShowInviteModal(true)} className="rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
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
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.invited}</p>
                  <p className="text-sm text-muted-foreground">Invited</p>
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
                  <p className="text-2xl font-bold">{stats.suspended}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          data={teamMembers}
          columns={columns}
          searchPlaceholder="Search by name or email..."
          filters={teamFilters}
          rowActions={rowActions}
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No team members found"
        />
      </div>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to a new team member. They will receive an email with instructions to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-firstName">First Name *</Label>
                <Input
                  id="inv-firstName"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-lastName">Last Name</Label>
                <Input
                  id="inv-lastName"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-email">Email *</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="team@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-role">Role *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <MultiSelect
                options={PERMISSION_LIST}
                defaultValue={inviteForm.permissions}
                onValueChange={(value) => setInviteForm({ ...inviteForm, permissions: value })}
                placeholder="Select permissions..."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default permissions for the selected role.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false)
                resetInviteForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={saving}>
              {saving ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {selectedMember?.firstName} {selectedMember?.lastName}&apos;s details and access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <MultiSelect
                options={PERMISSION_LIST}
                defaultValue={editForm.permissions}
                onValueChange={(value) => setEditForm({ ...editForm, permissions: value })}
                placeholder="Select permissions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {selectedMember?.firstName} {selectedMember?.lastName}
              </strong>{' '}
              ({selectedMember?.email}) from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setSelectedMember(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Invite Dialog */}
      <AlertDialog open={showResendDialog} onOpenChange={setShowResendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Resend the invitation email to{' '}
              <strong>
                {selectedMember?.firstName} {selectedMember?.lastName}
              </strong>{' '}
              at <strong>{selectedMember?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResendInvite} disabled={saving}>
              {saving ? 'Sending...' : 'Resend Invite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
