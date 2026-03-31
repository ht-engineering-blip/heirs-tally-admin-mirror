// Mock Data for E-Invoicing Admin Dashboard
// This file contains all mock data used across the application

  export interface Tenant {
    id: string;
    businessName: string;
    tin: string;
    email: string;
    status: 'active' | 'pending' | 'suspended' | 'inactive';
    plan: 'starter' | 'professional' | 'enterprise';
    createdAt: string;
    lastActivity: string;
    invoiceCount: number;
    erpType: string;
  }

export interface ErpSyncConfig {
  id: string;
  tenantId: string;
  erpType: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  createdAt: string;
}

export interface ErpSyncActivity {
  id: string;
  erpSyncConfigId: string;
  activity: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  type: 'outbound' | 'inbound';
  status: 'submitted' | 'validated' | 'failed' | 'pending' | 'cancelled';
  amount: number;
  currency: string;
  customerName: string;
  createdAt: string;
  firsUuid?: string;
  errorMessage?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'business_admin' | 'viewer';
  status: 'active' | 'pending' | 'locked';
  tenantId?: string;
  tenantName?: string;
  lastLogin: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  tenantName: string;
  maskedKey: string;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  lastUsed: string;
  callCount: number;
}

export interface SystemHealth {
  apiUptime: number;
  firsConnectivity: 'healthy' | 'degraded' | 'down';
  queueDepth: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalInvoices: number;
  invoicesToday: number;
  successRate: number;
  totalRevenue: number;
  pendingApprovals: number;
  errorCount: number;
}

// Generate mock erp sync configs
export const mockErpSyncConfig: ErpSyncConfig[] = [
  {
    id: 'erp-sync-config-001',
    tenantId: 'tenant-001',
    erpType: 'SAP',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'erp-sync-config-002',
    tenantId: 'tenant-002',
    erpType: 'Oracle',
    status: 'active',
    createdAt: '2024-02-20T14:15:00Z',
  },
  {
    id: 'erp-sync-config-003',
    tenantId: 'tenant-003',
    erpType: 'Sage',
    status: 'active',
    createdAt: '2024-03-05T10:30:00Z',
  },
  {
    id: 'erp-sync-config-004',
    tenantId: 'tenant-004',
    erpType: 'SAP',
    status: 'active',
    createdAt: '2024-04-15T10:30:00Z',
  },
  {
    id: 'erp-sync-config-005',
    tenantId: 'tenant-005',
    erpType: 'Oracle',
    status: 'active',
    createdAt: '2024-05-20T14:15:00Z',
  },
  {
    id: 'erp-sync-config-006',
    tenantId: 'tenant-006',
    erpType: 'Sage',
    status: 'active',
    createdAt: '2024-06-05T10:30:00Z',
  },
  {
    id: 'erp-sync-config-007',
    tenantId: 'tenant-007',
    erpType: 'SAP',
    status: 'active',
    createdAt: '2024-07-15T10:30:00Z',
  },
  {
    id: 'erp-sync-config-008',
    tenantId: 'tenant-008',
    erpType: 'Oracle',
    status: 'active',
    createdAt: '2024-08-20T14:15:00Z',
  },
];

// Generate mock tenants
export const mockTenants: Tenant[] = [
  {
    id: 'tenant-001',
    businessName: 'Acme Corporation Ltd',
    tin: 'TIN-12345678',
    email: 'admin@acme.com',
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-15T10:30:00Z',
    lastActivity: '2025-02-06T08:45:00Z',
    invoiceCount: 15420,
    erpType: 'SAP',
  },
  {
    id: 'tenant-002',
    businessName: 'Global Trade Partners',
    tin: 'TIN-23456789',
    email: 'finance@globaltp.com',
    status: 'active',
    plan: 'professional',
    createdAt: '2024-02-20T14:15:00Z',
    lastActivity: '2025-02-05T16:20:00Z',
    invoiceCount: 8752,
    erpType: 'Oracle',
  },
  {
    id: 'tenant-003',
    businessName: 'TechStart Innovations',
    tin: 'TIN-34567890',
    email: 'cfo@techstart.ng',
    status: 'pending',
    plan: 'starter',
    createdAt: '2025-01-28T09:00:00Z',
    lastActivity: '2025-02-01T11:30:00Z',
    invoiceCount: 0,
    erpType: 'Sage',
  },
  {
    id: 'tenant-004',
    businessName: 'Metro Retail Group',
    tin: 'TIN-45678901',
    email: 'accounts@metroretail.com',
    status: 'active',
    plan: 'enterprise',
    createdAt: '2023-11-05T08:00:00Z',
    lastActivity: '2025-02-06T09:10:00Z',
    invoiceCount: 42150,
    erpType: 'SAP',
  },
  {
    id: 'tenant-005',
    businessName: 'Swift Logistics Nigeria',
    tin: 'TIN-56789012',
    email: 'billing@swiftlog.ng',
    status: 'suspended',
    plan: 'professional',
    createdAt: '2024-05-12T13:45:00Z',
    lastActivity: '2025-01-15T10:00:00Z',
    invoiceCount: 3280,
    erpType: 'QuickBooks',
  },
  {
    id: 'tenant-006',
    businessName: 'Pinnacle Manufacturing',
    tin: 'TIN-67890123',
    email: 'finance@pinnaclemfg.com',
    status: 'active',
    plan: 'professional',
    createdAt: '2024-03-08T10:20:00Z',
    lastActivity: '2025-02-06T07:30:00Z',
    invoiceCount: 6890,
    erpType: 'Oracle',
  },
  {
    id: 'tenant-007',
    businessName: 'Sunrise Healthcare',
    tin: 'TIN-78901234',
    email: 'accounts@sunrisehc.com',
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-02T09:00:00Z',
    lastActivity: '2025-02-06T08:00:00Z',
    invoiceCount: 28450,
    erpType: 'SAP',
  },
  {
    id: 'tenant-008',
    businessName: 'Delta Foods International',
    tin: 'TIN-89012345',
    email: 'cfo@deltafoods.ng',
    status: 'inactive',
    plan: 'starter',
    createdAt: '2024-08-15T11:30:00Z',
    lastActivity: '2024-12-20T14:00:00Z',
    invoiceCount: 520,
    erpType: 'Tally',
  },
];

// Generate mock transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'txn-001',
    invoiceNumber: 'INV-2025-001542',
    tenantId: 'tenant-001',
    tenantName: 'Acme Corporation Ltd',
    type: 'outbound',
    status: 'submitted',
    amount: 2500000,
    currency: 'NGN',
    customerName: 'ABC Distributors',
    createdAt: '2025-02-06T09:15:00Z',
    firsUuid: 'FIRS-UUID-123456',
  },
  {
    id: 'txn-002',
    invoiceNumber: 'INV-2025-001541',
    tenantId: 'tenant-001',
    tenantName: 'Acme Corporation Ltd',
    type: 'outbound',
    status: 'validated',
    amount: 1850000,
    currency: 'NGN',
    customerName: 'XYZ Enterprises',
    createdAt: '2025-02-06T08:45:00Z',
    firsUuid: 'FIRS-UUID-123455',
  },
  {
    id: 'txn-003',
    invoiceNumber: 'INV-2025-000892',
    tenantId: 'tenant-002',
    tenantName: 'Global Trade Partners',
    type: 'inbound',
    status: 'submitted',
    amount: 4200000,
    currency: 'NGN',
    customerName: 'Prime Suppliers Ltd',
    createdAt: '2025-02-06T08:30:00Z',
    firsUuid: 'FIRS-UUID-123454',
  },
  {
    id: 'txn-004',
    invoiceNumber: 'INV-2025-001540',
    tenantId: 'tenant-001',
    tenantName: 'Acme Corporation Ltd',
    type: 'outbound',
    status: 'failed',
    amount: 750000,
    currency: 'NGN',
    customerName: 'Local Mart',
    createdAt: '2025-02-06T07:20:00Z',
    errorMessage: 'Invalid TIN format in buyer details',
  },
  {
    id: 'txn-005',
    invoiceNumber: 'INV-2025-004521',
    tenantId: 'tenant-004',
    tenantName: 'Metro Retail Group',
    type: 'outbound',
    status: 'submitted',
    amount: 12500000,
    currency: 'NGN',
    customerName: 'Bulk Buyers Inc',
    createdAt: '2025-02-06T06:50:00Z',
    firsUuid: 'FIRS-UUID-123453',
  },
  {
    id: 'txn-006',
    invoiceNumber: 'INV-2025-002156',
    tenantId: 'tenant-006',
    tenantName: 'Pinnacle Manufacturing',
    type: 'outbound',
    status: 'pending',
    amount: 3800000,
    currency: 'NGN',
    customerName: 'Construction Partners',
    createdAt: '2025-02-06T06:30:00Z',
  },
  {
    id: 'txn-007',
    invoiceNumber: 'INV-2025-008752',
    tenantId: 'tenant-007',
    tenantName: 'Sunrise Healthcare',
    type: 'outbound',
    status: 'submitted',
    amount: 890000,
    currency: 'NGN',
    customerName: 'Medical Supplies Ltd',
    createdAt: '2025-02-05T22:15:00Z',
    firsUuid: 'FIRS-UUID-123452',
  },
  {
    id: 'txn-008',
    invoiceNumber: 'INV-2025-000891',
    tenantId: 'tenant-002',
    tenantName: 'Global Trade Partners',
    type: 'inbound',
    status: 'validated',
    amount: 5600000,
    currency: 'NGN',
    customerName: 'Import House Nigeria',
    createdAt: '2025-02-05T18:40:00Z',
    firsUuid: 'FIRS-UUID-123451',
  },
  {
    id: 'txn-009',
    invoiceNumber: 'INV-2025-004520',
    tenantId: 'tenant-004',
    tenantName: 'Metro Retail Group',
    type: 'outbound',
    status: 'cancelled',
    amount: 2100000,
    currency: 'NGN',
    customerName: 'Retail Chain Ltd',
    createdAt: '2025-02-05T15:30:00Z',
  },
  {
    id: 'txn-010',
    invoiceNumber: 'INV-2025-002155',
    tenantId: 'tenant-006',
    tenantName: 'Pinnacle Manufacturing',
    type: 'outbound',
    status: 'failed',
    amount: 1250000,
    currency: 'NGN',
    customerName: 'Steel Works Co',
    createdAt: '2025-02-05T14:20:00Z',
    errorMessage: 'NRS service temporarily unavailable',
  },
];

// Mock users
export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: 'John Adeyemi',
    email: 'john.adeyemi@einvoice.ng',
    role: 'super_admin',
    status: 'active',
    lastLogin: '2025-02-06T08:00:00Z',
    createdAt: '2023-06-01T00:00:00Z',
  },
  {
    id: 'user-002',
    name: 'Sarah Okonkwo',
    email: 'sarah.o@einvoice.ng',
    role: 'admin',
    status: 'active',
    lastLogin: '2025-02-06T07:30:00Z',
    createdAt: '2023-08-15T00:00:00Z',
  },
  {
    id: 'user-003',
    name: 'Michael Chen',
    email: 'admin@acme.com',
    role: 'business_admin',
    status: 'active',
    tenantId: 'tenant-001',
    tenantName: 'Acme Corporation Ltd',
    lastLogin: '2025-02-06T08:45:00Z',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'user-004',
    name: 'Grace Eze',
    email: 'finance@globaltp.com',
    role: 'business_admin',
    status: 'active',
    tenantId: 'tenant-002',
    tenantName: 'Global Trade Partners',
    lastLogin: '2025-02-05T16:20:00Z',
    createdAt: '2024-02-20T14:15:00Z',
  },
  {
    id: 'user-005',
    name: 'David Okoro',
    email: 'cfo@techstart.ng',
    role: 'business_admin',
    status: 'pending',
    tenantId: 'tenant-003',
    tenantName: 'TechStart Innovations',
    lastLogin: '2025-02-01T11:30:00Z',
    createdAt: '2025-01-28T09:00:00Z',
  },
];

// Mock API keys
export const mockApiKeys: ApiKey[] = [
  {
    id: 'key-001',
    tenantId: 'tenant-001',
    tenantName: 'Acme Corporation Ltd',
    maskedKey: 'sk_live_****4f8a',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    expiresAt: '2025-07-15T10:30:00Z',
    lastUsed: '2025-02-06T09:15:00Z',
    callCount: 152480,
  },
  {
    id: 'key-002',
    tenantId: 'tenant-002',
    tenantName: 'Global Trade Partners',
    maskedKey: 'sk_live_****8b2c',
    status: 'active',
    createdAt: '2024-02-20T14:15:00Z',
    expiresAt: '2025-08-20T14:15:00Z',
    lastUsed: '2025-02-06T08:30:00Z',
    callCount: 87520,
  },
  {
    id: 'key-003',
    tenantId: 'tenant-004',
    tenantName: 'Metro Retail Group',
    maskedKey: 'sk_live_****3d9e',
    status: 'active',
    createdAt: '2023-11-05T08:00:00Z',
    expiresAt: '2025-05-05T08:00:00Z',
    lastUsed: '2025-02-06T09:10:00Z',
    callCount: 421500,
  },
];

// Dashboard statistics
export const mockDashboardStats: DashboardStats = {
  totalTenants: 248,
  activeTenants: 186,
  totalInvoices: 1542680,
  invoicesToday: 4852,
  successRate: 98.7,
  totalRevenue: 12500000000,
  pendingApprovals: 12,
  errorCount: 23,
};

// System health
export const mockSystemHealth: SystemHealth = {
  apiUptime: 99.98,
  firsConnectivity: 'healthy',
  queueDepth: 142,
  avgResponseTime: 245,
  errorRate: 0.12,
};

// Chart data for transaction volume
export const mockTransactionVolumeData = [
  { month: 'Jan', invoices: 125000, value: 45000000000 },
  { month: 'Feb', invoices: 142000, value: 52000000000 },
  { month: 'Mar', invoices: 138000, value: 48000000000 },
  { month: 'Apr', invoices: 156000, value: 58000000000 },
  { month: 'May', invoices: 148000, value: 55000000000 },
  { month: 'Jun', invoices: 172000, value: 65000000000 },
  { month: 'Jul', invoices: 165000, value: 62000000000 },
  { month: 'Aug', invoices: 178000, value: 68000000000 },
  { month: 'Sep', invoices: 185000, value: 72000000000 },
  { month: 'Oct', invoices: 192000, value: 75000000000 },
  { month: 'Nov', invoices: 205000, value: 82000000000 },
  { month: 'Dec', invoices: 198000, value: 78000000000 },
];

// Weekly trend data
export const mockWeeklyTrendData = [
  { day: 'Mon', invoices: 4200, success: 4150, failed: 50 },
  { day: 'Tue', invoices: 4580, success: 4520, failed: 60 },
  { day: 'Wed', invoices: 4320, success: 4280, failed: 40 },
  { day: 'Thu', invoices: 4890, success: 4830, failed: 60 },
  { day: 'Fri', invoices: 5120, success: 5050, failed: 70 },
  { day: 'Sat', invoices: 2840, success: 2810, failed: 30 },
  { day: 'Sun', invoices: 2150, success: 2130, failed: 20 },
];

// ERP distribution
export const mockErpDistribution = [
  { name: 'SAP', value: 42, color: 'hsl(var(--chart-1))' },
  { name: 'Oracle', value: 28, color: 'hsl(var(--chart-2))' },
  { name: 'Sage', value: 15, color: 'hsl(var(--chart-3))' },
  { name: 'QuickBooks', value: 10, color: 'hsl(var(--chart-4))' },
  { name: 'Others', value: 5, color: 'hsl(var(--chart-5))' },
];

// Tenant status distribution
export const mockTenantStatusData = [
  { status: 'Active', count: 186, color: 'hsl(var(--success))' },
  { status: 'Pending', count: 32, color: 'hsl(var(--warning))' },
  { status: 'Suspended', count: 18, color: 'hsl(var(--destructive))' },
  { status: 'Inactive', count: 12, color: 'hsl(var(--muted-foreground))' },
];
