'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Eye, Edit, Lock, Unlock, UserPlus, Mail } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { User } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const userFilters: FilterOption[] = [
  {
    key: 'role',
    label: 'Role',
    options: [
      { value: 'super_admin', label: 'Super Admin' },
      { value: 'admin', label: 'Admin' },
      { value: 'business_admin', label: 'Business Admin' },
      { value: 'viewer', label: 'Viewer' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'locked', label: 'Locked' },
    ],
  },
];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.users.getAll({
        page,
        pageSize: 10,
        search: searchQuery,
        ...filters,
      });
      setUsers(response.data);
      setTotal(response.pagination?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery, filters]);

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; className: string }> = {
      super_admin: { label: 'Super Admin', className: 'bg-primary/10 text-primary' },
      admin: { label: 'Admin', className: 'bg-info/10 text-info' },
      business_admin: { label: 'Business Admin', className: 'bg-accent/10 text-accent' },
      viewer: { label: 'Viewer', className: 'bg-muted text-muted-foreground' },
    };
    const { label, className } = config[role] || config.viewer;
    return <Badge className={className}>{label}</Badge>;
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      accessor: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (user) => getRoleBadge(user.role),
    },
    {
      key: 'tenantName',
      header: 'Tenant',
      accessor: (user) => (
        user.tenantName ? (
          <span className="text-sm">{user.tenantName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Platform User</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      accessor: (user) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (user) => (
        <span className="text-sm text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const rowActions = (user: User) => (
    <>
      <DropdownMenuItem>
        <Eye className="w-4 h-4 mr-2" />
        View Profile
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </DropdownMenuItem>
      {user.status === 'pending' && (
        <DropdownMenuItem>
          <Mail className="w-4 h-4 mr-2" />
          Resend Invite
        </DropdownMenuItem>
      )}
      {user.status === 'active' ? (
        <DropdownMenuItem className="text-warning">
          <Lock className="w-4 h-4 mr-2" />
          Lock Account
        </DropdownMenuItem>
      ) : user.status === 'locked' ? (
        <DropdownMenuItem className="text-success">
          <Unlock className="w-4 h-4 mr-2" />
          Unlock Account
        </DropdownMenuItem>
      ) : null}
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage platform and tenant users</p>
          </div>
          <Button className="rounded-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          data={users}
          columns={columns}
          searchPlaceholder="Search users by name or email..."
          filters={userFilters}
          rowActions={rowActions}
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          emptyMessage="No users found"
        />
      </div>
    </DashboardLayout>
  );
}
