"use client";

import {
  Column,
  DataTable,
  FilterOption,
  StatusBadge,
} from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatErpName, useSupportedErps } from "@/hooks/use-supported-erps";
import { getAdminApiClient } from "@/lib/api/client";
import { Building2, Edit, Eye, Loader2, Mail, Plus, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  tenantId: string;
  businessName: string;
  tin: string;
  businessRegistrationNumber?: string;
  contactEmail: string;
  contactPhone: string;
  erpSystem: string;
  status: "active" | "suspended" | "inactive" | "onboarding";
  createdAt: string;
  updatedAt?: string;
  config?: {
    erpSystem: string;
    features?: any;
    limits?: any;
    webhookUrl?: string;
    webhookEnabled?: boolean;
  };
  onboarding?: {
    status: "active" | "pending" | "in_progress" | "testing" | "rejected";
    progress?: number;
    notes?: string;
    rejectionReason?: string;
  };
}

const tenantFilters: FilterOption[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "all", label: "All Statuses" },
      { value: "active", label: "Active" },
      { value: "suspended", label: "Suspended" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

export default function Tenants() {
  const api = getAdminApiClient();
  const router = useRouter();
  const { erpOptions } = useSupportedErps({ includeAll: true });
  const ERP_OPTIONS = erpOptions.filter(
    (erp) =>
      !erp.includes("UBL") && !erp.includes("PEPPOL") && erp !== "CUSTOM",
  );
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [columnSort, setColumnSort] = useState<{
    key: string;
    order: "asc" | "desc";
  } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stats cards reflect ALL tenants platform-wide, independent of the table's
  // current page/filter/search — fetched separately so they don't get skewed
  // by whatever the table happens to be showing.
  const [stats, setStats] = useState({ total: 0, active: 0, invited: 0, suspended: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [resendingTenantId, setResendingTenantId] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    businessName: "",
    tin: "",
    businessRegistrationNumber: "",
    contactEmail: "",
    contactPhone: "",
    erpSystem: "" as string,
    expectedVolume: undefined as number | undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [onboardingData, setOnboardingData] = useState({
    status: "in_progress" as
      | "active"
      | "pending"
      | "in_progress"
      | "testing"
      | "rejected",
    notes: "",
    rejectionReason: "",
  });

  const extractId = (v: any): string | undefined => {
    if (!v) return undefined;
    if (typeof v === "string") return v;
    if (typeof v === "object" && v.$oid) return String(v.$oid);
    return undefined;
  };

  const mapTenant = (t: any): Tenant => ({
    id: extractId(t.id) ?? extractId(t._id) ?? String(t.tenantId ?? ""),
    tenantId: String(t.tenantId ?? extractId(t.id) ?? extractId(t._id) ?? ""),
    businessName: t.businessName,
    tin: t.tin,
    businessRegistrationNumber: t.businessRegistrationNumber,
    contactEmail: t.contactEmail,
    contactPhone: t.contactPhone,
    erpSystem: t.config?.erpSystem || t.erpSystem || "",
    status: t.status || "inactive",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    config: t.config,
    onboarding: t.onboarding,
  });

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const response = await api.v1.tenants.get({
        query: {
          page,
          limit: pageSize,
          onboarding: true,
          ...(filters.status && filters.status !== "all"
            ? { status: filters.status as any }
            : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
          sortBy: columnSort?.key ?? "createdAt",
          sortOrder: columnSort?.order ?? "desc",
        } as any,
      });

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to fetch tenants";
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const mappedTenants = (response.data.data as any[]).map(mapTenant);
        setTenants(mappedTenants);
        const pagination = (response.data as any)?.pagination;
        setTotal(pagination?.total ?? mappedTenants.length);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tenants");
    } finally {
      setIsLoading(false);
    }
  };

  // Platform-wide counts for the stat cards — a separate, unfiltered,
  // unpaginated fetch so the cards don't fluctuate with the table's own
  // page/filter/search state. TODO: swap for a dedicated stats/summary
  // endpoint once the backend adds one, instead of pulling up to 1000
  // tenants just to count them client-side.
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await (api as any).v1.tenants.analytics.get();
      if (!response.error && response.data?.data) {
        const d = response.data.data;
        setStats({
          total: d.total ?? 0,
          active: d.active ?? 0,
          invited: d.invited ?? 0,
          suspended: d.suspended ?? 0,
        });
      }
    } catch {
      // Stats are supplementary — a failed fetch here shouldn't block the table.
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, pageSize, filters.status, searchQuery, columnSort]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreate = async () => {
    const errors: Record<string, string> = {};
    if (!formData.businessName.trim())
      errors.businessName = "Business name is required";
    if (!formData.tin.trim())
      errors.tin = "Tax Identification Number is required";
    else if (formData.tin.trim().length < 10)
      errors.tin = "TIN must be at least 10 characters";
    if (!formData.businessRegistrationNumber.trim()) {
      errors.businessRegistrationNumber = "Registration number is required";
    } else if (
      !/^(RC|BN|IT|LP)[-\s]?\d{4,7}$/i.test(formData.businessRegistrationNumber.trim())
    ) {
      errors.businessRegistrationNumber =
        "Must be a valid CAC number (e.g. RC-123456, BN-98765, IT-12345)";
    }
    if (!formData.contactEmail.trim())
      errors.contactEmail = "Email address is required";
    if (!formData.contactPhone.trim())
      errors.contactPhone = "Contact phone is required";
    if (!formData.erpSystem)
      errors.erpSystem = "Please select an ERP system";
    if (!formData.expectedVolume || formData.expectedVolume <= 0)
      errors.expectedVolume = "Monthly invoice volume is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setSaving(true);
    try {
      const response = await api.v1.tenants.post({
        businessName: formData.businessName,
        tin: formData.tin,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        erpSystem: formData.erpSystem as any,
        expectedVolume: formData.expectedVolume,
      });

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to create tenant";
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success("Tenant created successfully");
        setShowCreateModal(false);
        resetForm();
        fetchTenants();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTenant) return;

    setSaving(true);
    try {
      const response = await api.v1
        .tenants({ tenantId: selectedTenant.tenantId })
        .patch({
          businessName: formData.businessName,
          contactPhone: formData.contactPhone,
          erpSystem: formData.erpSystem as any,
        });

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to update tenant";
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success("Tenant updated successfully");
        setShowEditModal(false);
        resetForm();
        fetchTenants();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;

    setSaving(true);
    try {
      const response = await api.v1
        .tenants({ tenantId: selectedTenant.tenantId })
        .delete();

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to delete tenant";
        toast.error(errorMessage);
      } else {
        toast.success("Tenant deleted successfully");
        setShowDeleteDialog(false);
        setSelectedTenant(null);
        fetchTenants();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedTenant) return;

    setSaving(true);
    try {
      const response = await api.v1
        .tenants({ tenantId: selectedTenant.tenantId })
        .activate.post({});

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to activate tenant";
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success("Tenant activated successfully");
        setShowActivateDialog(false);
        setSelectedTenant(null);
        fetchTenants();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to activate tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedTenant) return;

    setSaving(true);
    try {
      const response = await api.v1
        .tenants({ tenantId: selectedTenant.tenantId })
        .suspend.post({});

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to suspend tenant";
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success("Tenant suspended successfully");
        setShowSuspendDialog(false);
        setSelectedTenant(null);
        fetchTenants();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to suspend tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleResendActivation = async (tenant: Tenant) => {
    setResendingTenantId(tenant.tenantId);
    try {
      const response = await (api as any).v1.tenants.resend
        .token({ tenantId: tenant.tenantId })
        .post({});

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error || "Failed to resend activation email";
        toast.error(errorMessage);
      } else if (!response.data?.success) {
        toast.error((response.data as any)?.error || "Failed to resend activation email");
      } else {
        toast.success(response.data?.message || "Activation email resent successfully");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to resend activation email");
    } finally {
      setResendingTenantId(null);
    }
  };

  const handleUpdateOnboarding = async () => {
    if (!selectedTenant) return;

    setSaving(true);
    try {
      const response = await api.v1
        .tenants({ tenantId: selectedTenant.tenantId })
        .onboarding.patch({
          status: onboardingData.status,
          notes: onboardingData.notes,
          rejectionReason: onboardingData.rejectionReason || undefined,
        });

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error ||
          "Failed to update onboarding status";
        console.log({ errorMessage });
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success("Onboarding status updated successfully");
        setShowOnboardingModal(false);
        setSelectedTenant(null);
        resetOnboardingForm();
        fetchTenants();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update onboarding status");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      businessName: "",
      tin: "",
      businessRegistrationNumber: "",
      contactEmail: "",
      contactPhone: "",
      erpSystem: "",
      expectedVolume: undefined,
    });
    setFormErrors({});
  };

  const resetOnboardingForm = () => {
    setOnboardingData({
      status: "in_progress",
      notes: "",
      rejectionReason: "",
    });
  };

  const openEditModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      businessName: tenant.businessName,
      tin: tenant.tin,
      businessRegistrationNumber: tenant.businessRegistrationNumber || "",
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      erpSystem: tenant.config?.erpSystem || tenant.erpSystem || "",
      expectedVolume: undefined,
    });
    setShowEditModal(true);
  };

  const openOnboardingModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setOnboardingData({
      status: tenant.onboarding?.status || "in_progress",
      notes: tenant.onboarding?.notes || "",
      rejectionReason: tenant.onboarding?.rejectionReason || "",
    });
    setShowOnboardingModal(true);
  };

  const handleSort = (key: string, order: "asc" | "desc") => {
    setColumnSort({ key, order });
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      starter: "bg-muted text-muted-foreground",
      professional: "bg-info/10 text-info",
      enterprise: "bg-primary/10 text-primary",
    };
    return colors[plan] || "bg-muted text-muted-foreground";
  };

  const columns: Column<Tenant>[] = [
    {
      key: "businessName",
      header: "Business",
      sortable: true,
      accessor: (tenant) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {tenant.businessName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{tenant.businessName}</p>
            <p className="text-sm text-muted-foreground">
              {tenant.contactEmail}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "tin",
      header: "TIN",
      sortable: true,
      accessor: (tenant) => (
        <span className="font-mono text-sm">{tenant.tin}</span>
      ),
    },
    {
      key: "erpSystem",
      header: "ERP System",
      sortable: true,
      accessor: (tenant) => (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {formatErpName(tenant.config?.erpSystem || tenant.erpSystem)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (tenant) => (
        <StatusBadge status={tenant.status} />
      ),
    },
    {
      key: "onboarding",
      header: "Onboarding",
      accessor: (tenant) => {
        const onboardingStatus = tenant.onboarding?.status || "pending";
        const statusColors: Record<string, string> = {
          active: "bg-success/10 text-success",
          pending: "bg-warning/10 text-warning",
          in_progress: "bg-info/10 text-info",
          testing: "bg-primary/10 text-primary",
          rejected: "bg-destructive/10 text-destructive",
        };
        return (
          <Badge
            className={`${statusColors[onboardingStatus] || "bg-muted"} capitalize whitespace-nowrap`}
          >
            {onboardingStatus.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      accessor: (tenant) => (
        <span className="text-sm text-muted-foreground">
          {new Date(tenant.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const rowActions = (tenant: Tenant) => (
    <>
      <DropdownMenuItem
        onClick={() => router.push(`/admin/tenants/${tenant.tenantId}`)}
      >
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openEditModal(tenant)}>
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openOnboardingModal(tenant)}>
        <Edit className="w-4 h-4 mr-2" />
        Update Onboarding
      </DropdownMenuItem>
      {tenant.status === "onboarding" && (
        <DropdownMenuItem
          onClick={() => handleResendActivation(tenant)}
          disabled={resendingTenantId === tenant.tenantId}
        >
          <Mail className="w-4 h-4 mr-2" />
          {resendingTenantId === tenant.tenantId ? "Sending..." : "Resend Activation Email"}
        </DropdownMenuItem>
      )}
      {tenant.status === "active" || tenant.status === "onboarding" ? (
        <DropdownMenuItem
          onClick={() => {
            setSelectedTenant(tenant);
            setShowSuspendDialog(true);
          }}
          className="text-warning"
        >
          <Power className="w-4 h-4 mr-2" />
          Suspend
        </DropdownMenuItem>
      ) : tenant.status === "suspended" || tenant.status === "inactive" ? (
        <DropdownMenuItem
          onClick={() => {
            setSelectedTenant(tenant);
            setShowActivateDialog(true);
          }}
          className="text-success"
        >
          <Power className="w-4 h-4 mr-2" />
          Activate
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        onClick={() => {
          setSelectedTenant(tenant);
          setShowDeleteDialog(true);
        }}
        className="text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Tenant Management</h1>
            <p className="page-subtitle">
              Manage all registered tenants on the platform
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.total}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-success">
                      {stats.active}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-warning" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-warning">
                      {stats.suspended}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-info" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-info">{stats.invited}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Invited</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          data={tenants}
          columns={columns}
          searchPlaceholder="Search tenants by name, TIN, or email..."
          filters={tenantFilters}
          rowActions={rowActions}
          selectable
          isLoading={isLoading}
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onSearch={(q) => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => {
              setSearchQuery(q);
              setPage(1);
            }, 400);
          }}
          onFilterChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          onSort={handleSort}
          onRowClick={(tenant) => router.push(`/admin/tenants/${tenant.tenantId}`)}
          emptyMessage="No tenants found"
        />
      </div>

      {/* Create Tenant Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Add a new tenant to the platform. All fields marked with * are
              required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => {
                  setFormData({ ...formData, businessName: e.target.value });
                  if (formErrors.businessName)
                    setFormErrors((prev) => ({ ...prev, businessName: "" }));
                }}
                placeholder="Enter business name"
                className={formErrors.businessName ? "border-destructive" : ""}
              />
              {formErrors.businessName && (
                <p className="text-xs text-destructive">{formErrors.businessName}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tin">TIN *</Label>
                <Input
                  id="tin"
                  value={formData.tin}
                  onChange={(e) => {
                    setFormData({ ...formData, tin: e.target.value });
                    if (formErrors.tin)
                      setFormErrors((prev) => ({ ...prev, tin: "" }));
                  }}
                  placeholder="Tax Identification Number"
                  className={formErrors.tin ? "border-destructive" : ""}
                />
                {formErrors.tin && (
                  <p className="text-xs text-destructive">{formErrors.tin}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessRegistrationNumber">
                  Registration Number *
                </Label>
                <Input
                  id="businessRegistrationNumber"
                  value={formData.businessRegistrationNumber}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      businessRegistrationNumber: e.target.value,
                    });
                    if (formErrors.businessRegistrationNumber)
                      setFormErrors((prev) => ({
                        ...prev,
                        businessRegistrationNumber: "",
                      }));
                  }}
                  placeholder="RC-123456 or BN-98765"
                  className={
                    formErrors.businessRegistrationNumber
                      ? "border-destructive"
                      : ""
                  }
                />
                {formErrors.businessRegistrationNumber ? (
                  <p className="text-xs text-destructive">
                    {formErrors.businessRegistrationNumber}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nigerian CAC number (RC, BN, IT, or LP prefix)
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, contactEmail: e.target.value });
                    if (formErrors.contactEmail)
                      setFormErrors((prev) => ({ ...prev, contactEmail: "" }));
                  }}
                  placeholder="contact@business.com"
                  className={formErrors.contactEmail ? "border-destructive" : ""}
                />
                {formErrors.contactEmail && (
                  <p className="text-xs text-destructive">{formErrors.contactEmail}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, contactPhone: e.target.value });
                    if (formErrors.contactPhone)
                      setFormErrors((prev) => ({ ...prev, contactPhone: "" }));
                  }}
                  placeholder="+234 800 000 0000"
                  className={formErrors.contactPhone ? "border-destructive" : ""}
                />
                {formErrors.contactPhone && (
                  <p className="text-xs text-destructive">{formErrors.contactPhone}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="erpSystem">ERP System *</Label>
                <Select
                  value={formData.erpSystem}
                  onValueChange={(value) => {
                    setFormData({ ...formData, erpSystem: value });
                    if (formErrors.erpSystem)
                      setFormErrors((prev) => ({ ...prev, erpSystem: "" }));
                  }}
                >
                  <SelectTrigger
                    className={formErrors.erpSystem ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select ERP system" />
                  </SelectTrigger>
                  <SelectContent>
                    {ERP_OPTIONS.map((erp) => (
                      <SelectItem key={erp} value={erp}>
                        {formatErpName(erp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.erpSystem && (
                  <p className="text-xs text-destructive">{formErrors.erpSystem}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedVolume">
                  Monthly Invoice Volume *
                </Label>
                <Input
                  id="expectedVolume"
                  type="number"
                  value={formData.expectedVolume || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      expectedVolume: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    });
                    if (formErrors.expectedVolume)
                      setFormErrors((prev) => ({ ...prev, expectedVolume: "" }));
                  }}
                  placeholder="Monthly invoice volume"
                  className={formErrors.expectedVolume ? "border-destructive" : ""}
                />
                {formErrors.expectedVolume && (
                  <p className="text-xs text-destructive">{formErrors.expectedVolume}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-businessName">Business Name *</Label>
              <Input
                id="edit-businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                placeholder="Enter business name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contactEmail">Email</Label>
                <Input
                  id="edit-contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  disabled
                  placeholder="contact@business.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactPhone">Contact Phone *</Label>
                <Input
                  id="edit-contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-erpSystem">ERP System *</Label>
              <Select
                value={formData.erpSystem}
                onValueChange={(value) =>
                  setFormData({ ...formData, erpSystem: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ERP system" />
                </SelectTrigger>
                <SelectContent>
                  {ERP_OPTIONS.map((erp) => (
                    <SelectItem key={erp} value={erp}>
                      {formatErpName(erp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
                setSelectedTenant(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Updating..." : "Update Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedTenant?.businessName}</strong>? This action will
              soft-delete the tenant and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTenant(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Confirmation Dialog */}
      <AlertDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate{" "}
              <strong>{selectedTenant?.businessName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTenant(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={saving}
            >
              {saving ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend{" "}
              <strong>{selectedTenant?.businessName}</strong>? The tenant will
              not be able to use the platform until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTenant(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={saving}
            >
              {saving ? "Suspending..." : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Onboarding Status Modal */}
      <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Onboarding Status</DialogTitle>
            <DialogDescription>
              Update the onboarding status for{" "}
              <strong>{selectedTenant?.businessName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-status">Onboarding Status *</Label>
              <Select
                value={onboardingData.status}
                onValueChange={(value: any) =>
                  setOnboardingData({ ...onboardingData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-notes">Notes</Label>
              <Input
                id="onboarding-notes"
                value={onboardingData.notes}
                onChange={(e) =>
                  setOnboardingData({
                    ...onboardingData,
                    notes: e.target.value,
                  })
                }
                placeholder="Additional notes about onboarding"
              />
            </div>
            {onboardingData.status === "rejected" && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Input
                  id="rejection-reason"
                  value={onboardingData.rejectionReason}
                  onChange={(e) =>
                    setOnboardingData({
                      ...onboardingData,
                      rejectionReason: e.target.value,
                    })
                  }
                  placeholder="Reason for rejection"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowOnboardingModal(false);
                resetOnboardingForm();
                setSelectedTenant(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateOnboarding}
              disabled={
                saving ||
                (onboardingData.status === "rejected" &&
                  !onboardingData.rejectionReason)
              }
            >
              {saving ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
