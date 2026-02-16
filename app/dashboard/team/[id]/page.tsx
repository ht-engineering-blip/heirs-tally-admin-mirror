'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Shield,
  Clock,
  User,
  Pencil,
  Ban,
  UserCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { StatusBadge } from '@/components/shared'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions, BUSINESS_TEAM_MEMBER_PERMISSIONS, MEMBER_ROLES } from '@/hooks/use-permissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface TeamMemberDetail {
  id: string
  userId?: string
  email: string
  status: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
  invitedAt?: string | Date
  acceptedAt?: string | Date
  lastLoginAt?: string | Date
  invitedBy?: string
}

const PERMISSION_LIST = BUSINESS_TEAM_MEMBER_PERMISSIONS.map((p) => ({
  value: p,
  label: p.replace(':', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}))

const ROLES_OPTIONS = Object.values(MEMBER_ROLES)

export default function TeamMemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string
  const { tenantId } = useTenant()
  const { hasPermission } = usePermissions()

  const canUpdate = hasPermission('team:update')
  const canRemove = hasPermission('team:remove')

  const [isLoading, setIsLoading] = useState(true)
  const [member, setMember] = useState<TeamMemberDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showResendDialog, setShowResendDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: '',
    status: '',
    permissions: [] as string[],
  })

  const fetchMember = async () => {
    if (!tenantId || !memberId) return
    setIsLoading(true)
    setError(null)
    try {
      const api = createTenantApi()
      const response = await api.getTeamMember(tenantId, memberId)
      if (response.error) {
        setError((response.error as any)?.value?.error || 'Failed to load team member')
      } else if (response.data?.data) {
        const data = response.data.data as any
        setMember({
          ...data,
          id: data.userId || data.id || memberId,
        })
      } else {
        setError('Team member not found')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load team member')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId && memberId) fetchMember()
  }, [tenantId, memberId])

  const openEditModal = () => {
    if (!member) return
    setEditForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      role: member.role || '',
      status: member.status || '',
      permissions: member.permissions || [],
    })
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!member) return
    setSaving(true)
    try {
      const api = createTenantApi()
      const data: any = {}
      if (editForm.firstName) data.firstName = editForm.firstName
      if (editForm.lastName) data.lastName = editForm.lastName
      if (editForm.role) data.role = editForm.role
      if (editForm.status) data.status = editForm.status
      if (editForm.permissions.length > 0) data.permissions = editForm.permissions

      const response = await api.updateTeamMember(tenantId!, member.id, data)
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to update team member')
      } else {
        toast.success('Team member updated successfully')
        setShowEditModal(false)
        fetchMember()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update team member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!member) return
    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.removeTeamMember(tenantId!, member.id)
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to remove team member')
      } else {
        toast.success('Team member removed')
        router.push('/dashboard/team')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove team member')
    } finally {
      setSaving(false)
    }
  }

  const handleResendInvite = async () => {
    if (!member) return
    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.resendInvite(tenantId!, member.id)
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to resend invite')
      } else {
        toast.success('Invitation resent successfully')
        setShowResendDialog(false)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend invite')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!member) return
    const newStatus = member.status?.toLowerCase() === 'active' ? 'suspended' : 'active'
    setSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.updateTeamMember(tenantId!, member.id, {
        status: newStatus as 'active' | 'suspended',
      })
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to update status')
      } else {
        toast.success(`Member ${newStatus === 'suspended' ? 'suspended' : 'activated'}`)
        fetchMember()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading member details...</p>
        </div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/team')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium">{error || 'Member not found'}</p>
            <p className="text-sm text-muted-foreground">
              The team member could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isInvited = member.status?.toLowerCase() === 'invited'
  const isActive = member.status?.toLowerCase() === 'active'
  const initials = `${member.firstName?.charAt(0) || ''}${member.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/team')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {member.firstName} {member.lastName}
                </h1>
                <p className="text-muted-foreground">{member.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={member.status} />
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={openEditModal}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Member Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField
                  icon={<User className="w-4 h-4" />}
                  label="Full Name"
                  value={`${member.firstName} ${member.lastName || ''}`}
                />
                <DetailField
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={member.email}
                />
                <DetailField
                  icon={<Shield className="w-4 h-4" />}
                  label="Role"
                  value={<span className="capitalize font-medium">{member.role}</span>}
                />
                <DetailField
                  icon={<AlertCircle className="w-4 h-4" />}
                  label="Status"
                  value={<StatusBadge status={member.status} />}
                />
                {member.invitedAt && (
                  <DetailField
                    icon={<Clock className="w-4 h-4" />}
                    label="Invited"
                    value={
                      <div>
                        <p>{format(new Date(member.invitedAt), 'PPP')}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(member.invitedAt), { addSuffix: true })}
                        </p>
                      </div>
                    }
                  />
                )}
                {member.acceptedAt && (
                  <DetailField
                    icon={<UserCheck className="w-4 h-4" />}
                    label="Accepted"
                    value={format(new Date(member.acceptedAt), 'PPP')}
                  />
                )}
                {member.lastLoginAt && (
                  <DetailField
                    icon={<Clock className="w-4 h-4" />}
                    label="Last Login"
                    value={
                      <div>
                        <p>{format(new Date(member.lastLoginAt), 'PPpp')}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true })}
                        </p>
                      </div>
                    }
                  />
                )}
                {member.invitedBy && (
                  <DetailField
                    icon={<User className="w-4 h-4" />}
                    label="Invited By"
                    value={member.invitedBy}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canUpdate && isInvited && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowResendDialog(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Invitation
                  </Button>
                )}
                {canUpdate && !isInvited && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleToggleStatus}
                    disabled={saving}
                  >
                    {isActive ? (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        Suspend Member
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Activate Member
                      </>
                    )}
                  </Button>
                )}
                {canRemove && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowRemoveDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Member
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Permissions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                {member.permissions && member.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {member.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Using default permissions for <span className="capitalize font-medium">{member.role}</span> role.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {member.firstName} {member.lastName}'s details and access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
              <Label>Role</Label>
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
              <Label>Status</Label>
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

      {/* Remove Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {member.firstName} {member.lastName}
              </strong>{' '}
              ({member.email}) from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                {member.firstName} {member.lastName}
              </strong>{' '}
              at <strong>{member.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendInvite} disabled={saving}>
              {saving ? 'Sending...' : 'Resend Invite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DetailField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm">{value || 'N/A'}</div>
      </div>
    </div>
  )
}
