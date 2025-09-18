// Frontend API Configuration with Session-based Authentication
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

// Base API class with session handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get session ID from cookie or localStorage
    let sessionId = '';
    if (typeof window !== 'undefined') {
      // Try to get from cookie first
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session_id='));
      if (sessionCookie) {
        sessionId = sessionCookie.split('=')[1];
      }
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId && { 'X-Session-ID': sessionId }),
        ...options.headers,
      },
      credentials: 'include', // Include cookies
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            // Clear any stored session data
            document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/';
          }
        }
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(`${endpoint}${queryString}`);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    // Get session ID for upload requests
    let sessionId = '';
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session_id='));
      if (sessionCookie) {
        sessionId = sessionCookie.split('=')[1];
      }
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        ...(sessionId && { 'X-Session-ID': sessionId }),
      },
      body: formData,
    });
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL);

// ==========================
// Authentication API
// ==========================
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),

  logout: () => apiClient.post('/auth/logout'),

  getCurrentUser: () => apiClient.get('/auth/me'),

  getActiveSessions: () => apiClient.get('/auth/active-sessions'),

  forceLogout: (userId: number) => apiClient.post('/auth/force-logout', { user_id: userId })
};

// ==========================
// Users API
// ==========================
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role_id?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<any>>('/api/users', params),

  create: (userData: any) => apiClient.post('/api/users', userData),

  get: (userId: number) => apiClient.get(`/api/users/${userId}`),

  update: (userId: number, userData: any) => apiClient.put(`/api/users/${userId}`, userData),

  delete: (userId: number) => apiClient.delete(`/api/users/${userId}`),

  // Sessions
  getUserSessions: (userId: number) => apiClient.get(`/api/users/${userId}/sessions`),

  terminateUserSessions: (userId: number) => apiClient.post(`/api/users/${userId}/terminate-sessions`),

  // Roles
  listRoles: () => apiClient.get('/api/users/roles/list'),

  createRole: (roleData: any) => apiClient.post('/api/users/roles', roleData),

  updateRole: (roleId: number, roleData: any) => apiClient.put(`/api/users/roles/${roleId}`, roleData),

  deleteRole: (roleId: number) => apiClient.delete(`/api/users/roles/${roleId}`)
};

// ==========================
// Clients API
// ==========================
export const clientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<any>>('/api/clients', params),

  create: (clientData: any) => apiClient.post('/api/clients', clientData),

  get: (clientId: number) => apiClient.get(`/api/clients/${clientId}`),

  update: (clientId: number, clientData: any) => apiClient.put(`/api/clients/${clientId}`, clientData),

  delete: (clientId: number) => apiClient.delete(`/api/clients/${clientId}`),

  getAwsMappings: (clientId: number) => apiClient.get(`/api/clients/${clientId}/aws`)
};

// ==========================
// Invoices API
// ==========================
export const invoicesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; client_id?: number }) =>
    apiClient.get<PaginatedResponse<any>>('/api/invoices', params),

  create: (invoiceData: any) => apiClient.post('/api/invoices', invoiceData),

  get: (invoiceId: number) => apiClient.get(`/api/invoices/${invoiceId}`),

  update: (invoiceId: number, invoiceData: any) => apiClient.put(`/api/invoices/${invoiceId}`, invoiceData),

  delete: (invoiceId: number) => apiClient.delete(`/api/invoices/${invoiceId}`)
};

// ==========================
// Services API
// ==========================
export const servicesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; category_id?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<any>>('/api/services', params),

  create: (serviceData: any) => apiClient.post('/api/services', serviceData),

  get: (serviceId: number) => apiClient.get(`/api/services/${serviceId}`),

  update: (serviceId: number, serviceData: any) => apiClient.put(`/api/services/${serviceId}`, serviceData),

  delete: (serviceId: number) => apiClient.delete(`/api/services/${serviceId}`),

  listCategories: () => apiClient.get('/api/services/categories/list')
};

// ==========================
// Documents API
// ==========================
export const documentsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; document_type?: string; entity_type?: string }) =>
    apiClient.get<PaginatedResponse<any>>('/api/documents', params),

  upload: (formData: FormData) => apiClient.upload('/api/documents', formData),

  get: (documentId: number) => apiClient.get(`/api/documents/${documentId}`),

  update: (documentId: number, documentData: any) => apiClient.put(`/api/documents/${documentId}`, documentData),

  delete: (documentId: number) => apiClient.delete(`/api/documents/${documentId}`),

  download: (documentId: number) => {
    // For downloads, we need to handle differently
    const sessionId = document.cookie.split(';').find(cookie => cookie.trim().startsWith('session_id='))?.split('=')[1];
    const url = `${API_BASE_URL}/api/documents/${documentId}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    if (sessionId) {
      link.setAttribute('data-session-id', sessionId);
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// ==========================
// Usage Import API
// ==========================
export const usageApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; client_id?: number }) =>
    apiClient.get<PaginatedResponse<any>>('/api/usage', params),

  import: (formData: FormData) => apiClient.upload('/api/usage/import', formData),

  get: (importId: number) => apiClient.get(`/api/usage/${importId}`),

  delete: (importId: number) => apiClient.delete(`/api/usage/${importId}`)
};

// ==========================
// Analytics API
// ==========================
export const analyticsApi = {
  getSuperAdminAnalytics: () => apiClient.get('/api/analytics/super-admin'),

  getClientManagerAnalytics: () => apiClient.get('/api/analytics/client-manager'),

  getAuditorAnalytics: () => apiClient.get('/api/analytics/auditor')
};

// ==========================
// Reports API
// ==========================
export const reportsApi = {
  getRevenueReport: (params?: { start_date?: string; end_date?: string; client_id?: number }) =>
    apiClient.get('/api/reports/revenue', params),

  getGstReport: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get('/api/reports/gst', params),

  getClientSummary: (params?: { client_id?: number }) =>
    apiClient.get('/api/reports/client-summary', params),

  getServiceUsage: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get('/api/reports/service-usage', params)
};

// ==========================
// Dashboard API
// ==========================
export const dashboardApi = {
  getDashboardData: () => apiClient.get('/api/dashboard')
};

// Export the API client for custom requests
export { apiClient };