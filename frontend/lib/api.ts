import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add user email
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        config.headers['X-User-Email'] = user.email;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_data');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  clients?: T[];
  users?: T[];
  invoices?: T[];
  documents?: T[];
  imports?: T[];
  notifications?: T[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
}

// Authentication API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }),
  
  logout: () => fetch('/api/auth/logout', { method: 'POST' }),
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role_id?: number; status?: string }) =>
    api.get<PaginatedResponse<any>>('/users', { params }),
  
  create: (userData: any) => api.post<ApiResponse<{ user: any }>>('/users', userData),
  
  get: (userId: number) => api.get<ApiResponse<{ user: any; assigned_clients: any[] }>>(`/users/${userId}`),
  
  update: (userId: number, userData: any) => api.put<ApiResponse<{ user: any }>>(`/users/${userId}`, userData),
  
  delete: (userId: number) => api.delete<ApiResponse>(`/users/${userId}`),
  
  // Roles
  listRoles: () => api.get<ApiResponse<{ roles: any[] }>>('/users/roles'),
  
  createRole: (roleData: any) => api.post<ApiResponse<{ role: any }>>('/users/roles', roleData),
  
  getRole: (roleId: number) => api.get<ApiResponse<{ role: any }>>(`/users/roles/${roleId}`),
  
  updateRole: (roleId: number, roleData: any) => api.put<ApiResponse<{ role: any }>>(`/users/roles/${roleId}`, roleData),
  
  deleteRole: (roleId: number) => api.delete<ApiResponse>(`/users/roles/${roleId}`)
};

// Clients API
export const clientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<PaginatedResponse<any>>('/clients', { params }),
  
  create: (clientData: any) => api.post<ApiResponse<{ client: any }>>('/clients', clientData),
  
  get: (clientId: number) => api.get<ApiResponse<{ client: any; aws_mappings: any[]; assigned_managers: any[] }>>(`/clients/${clientId}`),
  
  update: (clientId: number, clientData: any) => api.put<ApiResponse<{ client: any }>>(`/clients/${clientId}`, clientData),
  
  delete: (clientId: number) => api.delete<ApiResponse>(`/clients/${clientId}`),
  
  getAwsMappings: (clientId: number) => api.get<ApiResponse<{ aws_account_ids: string[]; aws_mappings: any[] }>>(`/clients/${clientId}/aws`),
  
  assignManager: (clientId: number, userId: number) => api.post<ApiResponse>(`/clients/${clientId}/assign`, { user_id: userId }),
  
  unassignManager: (clientId: number, userId: number) => api.post<ApiResponse>(`/clients/${clientId}/unassign`, { user_id: userId })
};

// Analytics API
export const analyticsApi = {
  getSuperAdminAnalytics: () => api.get<any>('/analytics/super-admin'),
  
  getClientManagerAnalytics: () => api.get<any>('/analytics/client-manager'),
  
  getAuditorAnalytics: () => api.get<any>('/analytics/auditor'),
  
  cacheAnalytics: () => api.post<ApiResponse>('/analytics/cache'),
  
  refreshCache: () => api.put<ApiResponse>('/analytics/cache'),
  
  clearCache: () => api.delete<ApiResponse>('/analytics/cache')
};

export default api;