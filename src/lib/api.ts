// Mock API Proxy Service
// All API calls go through this proxy and return mock data

import {
  mockTenants,
  mockTransactions,
  mockUsers,
  mockApiKeys,
  mockDashboardStats,
  mockSystemHealth,
  mockTransactionVolumeData,
  mockWeeklyTrendData,
  mockErpDistribution,
  mockTenantStatusData,
  type Tenant,
  type Transaction,
  type User,
  type ApiKey,
  type DashboardStats,
  type SystemHealth,
  ErpSyncConfig,
  mockErpSyncConfig,
} from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Tenant API
export const tenantApi = {
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<Tenant[]>> {
    await delay(300);
    
    let filtered = [...mockTenants];
    
    // Filter by status
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(t => t.status === params.status);
    }
    
    // Search
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.businessName.toLowerCase().includes(search) ||
        t.tin.toLowerCase().includes(search) ||
        t.email.toLowerCase().includes(search)
      );
    }
    
    // Sort
    if (params?.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[params.sortBy as keyof Tenant];
        const bVal = b[params.sortBy as keyof Tenant];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return params.sortOrder === 'desc' 
            ? bVal.localeCompare(aVal) 
            : aVal.localeCompare(bVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return params.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        }
        return 0;
      });
    }
    
    // Pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },
  
  async getById(id: string): Promise<ApiResponse<Tenant | null>> {
    await delay(200);
    const tenant = mockTenants.find(t => t.id === id);
    return {
      success: !!tenant,
      data: tenant || null,
      message: tenant ? undefined : 'Tenant not found',
    };
  },
  
  async create(data: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    await delay(400);
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      businessName: data.businessName || '',
      tin: data.tin || '',
      email: data.email || '',
      status: 'pending',
      plan: data.plan || 'starter',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      invoiceCount: 0,
      erpType: data.erpType || '',
    };
    return { success: true, data: newTenant };
  },
  
  async updateStatus(id: string, status: Tenant['status']): Promise<ApiResponse<Tenant>> {
    await delay(300);
    const tenant = mockTenants.find(t => t.id === id);
    if (tenant) {
      tenant.status = status;
    }
    return { success: true, data: tenant! };
  },
};

// ERP Sync Config API
export const erpSyncConfigApi = {
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<ErpSyncConfig[]>> {
    await delay(300);
    
    let filtered = [...mockErpSyncConfig];
    
    // Filter by status
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(t => t.status === params.status);
    }
    
    // Search
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.erpType.toLowerCase().includes(search)
      );
    }
    
    // Sort
    if (params?.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[params.sortBy as keyof ErpSyncConfig];
        const bVal = b[params.sortBy as keyof ErpSyncConfig];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return params.sortOrder === 'desc' 
            ? bVal.localeCompare(aVal) 
            : aVal.localeCompare(bVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return params.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        }
        return 0;
      });
    }
    
    // Pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },
};

// Transaction API
export const transactionApi = {
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    tenantId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<Transaction[]>> {
    await delay(300);
    
    let filtered = [...mockTransactions];
    
    // Filter by status
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(t => t.status === params.status);
    }
    
    // Filter by type
    if (params?.type && params.type !== 'all') {
      filtered = filtered.filter(t => t.type === params.type);
    }
    
    // Filter by tenant
    if (params?.tenantId) {
      filtered = filtered.filter(t => t.tenantId === params.tenantId);
    }
    
    // Search
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.invoiceNumber.toLowerCase().includes(search) ||
        t.customerName.toLowerCase().includes(search) ||
        t.tenantName.toLowerCase().includes(search)
      );
    }
    
    // Sort
    if (params?.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[params.sortBy as keyof Transaction];
        const bVal = b[params.sortBy as keyof Transaction];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return params.sortOrder === 'desc' 
            ? bVal.localeCompare(aVal) 
            : aVal.localeCompare(bVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return params.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        }
        return 0;
      });
    }
    
    // Pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },
  
  async getById(id: string): Promise<ApiResponse<Transaction | null>> {
    await delay(200);
    const transaction = mockTransactions.find(t => t.id === id);
    return {
      success: !!transaction,
      data: transaction || null,
    };
  },
  
  async retry(id: string): Promise<ApiResponse<Transaction>> {
    await delay(500);
    const transaction = mockTransactions.find(t => t.id === id);
    if (transaction) {
      transaction.status = 'pending';
    }
    return { success: true, data: transaction! };
  },
};

// User API
export const userApi = {
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<User[]>> {
    await delay(300);
    
    let filtered = [...mockUsers];
    
    if (params?.role && params.role !== 'all') {
      filtered = filtered.filter(u => u.role === params.role);
    }
    
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(u => u.status === params.status);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },
};

// API Key management
export const apiKeyApi = {
  async getAll(): Promise<ApiResponse<ApiKey[]>> {
    await delay(300);
    return { success: true, data: mockApiKeys };
  },
  
  async rotate(keyId: string): Promise<ApiResponse<ApiKey>> {
    await delay(500);
    const key = mockApiKeys.find(k => k.id === keyId);
    if (key) {
      key.maskedKey = `sk_live_****${Math.random().toString(36).substring(2, 6)}`;
      key.createdAt = new Date().toISOString();
    }
    return { success: true, data: key! };
  },
  
  async revoke(keyId: string): Promise<ApiResponse<ApiKey>> {
    await delay(300);
    const key = mockApiKeys.find(k => k.id === keyId);
    if (key) {
      key.status = 'revoked';
    }
    return { success: true, data: key! };
  },
};

// Dashboard Stats API
export const dashboardApi = {
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    await delay(200);
    return { success: true, data: mockDashboardStats };
  },
  
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    await delay(200);
    return { success: true, data: mockSystemHealth };
  },
  
  async getTransactionVolume(): Promise<ApiResponse<typeof mockTransactionVolumeData>> {
    await delay(300);
    return { success: true, data: mockTransactionVolumeData };
  },
  
  async getWeeklyTrend(): Promise<ApiResponse<typeof mockWeeklyTrendData>> {
    await delay(300);
    return { success: true, data: mockWeeklyTrendData };
  },
  
  async getErpDistribution(): Promise<ApiResponse<typeof mockErpDistribution>> {
    await delay(300);
    return { success: true, data: mockErpDistribution };
  },
  
  async getTenantStatus(): Promise<ApiResponse<typeof mockTenantStatusData>> {
    await delay(300);
    return { success: true, data: mockTenantStatusData };
  },
};

// Export all APIs
export const api = {
  tenants: tenantApi,
  erpSyncConfigs: erpSyncConfigApi,
  transactions: transactionApi,
  users: userApi,
  apiKeys: apiKeyApi,
  dashboard: dashboardApi,
};
