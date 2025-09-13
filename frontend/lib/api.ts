import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/';
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
  items: T[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
}

// Authentication API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: any; token: string }>>('/auth/login', credentials),
  
  logout: () => api.post<ApiResponse>('/auth/logout'),
  
  getCurrentUser: () => api.get<ApiResponse<{ user: any; permissions: any }>>('/auth/me'),
  
  refreshToken: () => api.post<ApiResponse<{ token: string }>>('/auth/refresh'),
  
  verifyToken: () => api.post<ApiResponse<{ valid: boolean; user: any }>>('/auth/verify')
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role_id?: number; status?: string }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/users', { params }),
  
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
    api.get<ApiResponse<PaginatedResponse<any>>>('/clients', { params }),
  
  create: (clientData: any) => api.post<ApiResponse<{ client: any }>>('/clients', clientData),
  
  get: (clientId: number) => api.get<ApiResponse<{ client: any; aws_mappings: any[]; assigned_managers: any[] }>>(`/clients/${clientId}`),
  
  update: (clientId: number, clientData: any) => api.put<ApiResponse<{ client: any }>>(`/clients/${clientId}`, clientData),
  
  delete: (clientId: number) => api.delete<ApiResponse>(`/clients/${clientId}`),
  
  getAwsMappings: (clientId: number) => api.get<ApiResponse<{ aws_account_ids: string[]; aws_mappings: any[] }>>(`/clients/${clientId}/aws`),
  
  assignManager: (clientId: number, userId: number) => api.post<ApiResponse>(`/clients/${clientId}/assign`, { user_id: userId }),
  
  unassignManager: (clientId: number, userId: number) => api.post<ApiResponse>(`/clients/${clientId}/unassign`, { user_id: userId })
};

// Services API
export const servicesApi = {
  // Categories
  listCategories: () => api.get<ApiResponse<{ categories: any[] }>>('/services/categories'),
  
  createCategory: (categoryData: any) => api.post<ApiResponse<{ category: any }>>('/services/categories', categoryData),
  
  // Services
  list: (params?: { page?: number; limit?: number; search?: string; category_id?: number; status?: string }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/services', { params }),
  
  create: (serviceData: any) => api.post<ApiResponse<{ service: any }>>('/services', serviceData),
  
  get: (serviceId: number) => api.get<ApiResponse<{ service: any }>>(`/services/${serviceId}`),
  
  update: (serviceId: number, serviceData: any) => api.put<ApiResponse<{ service: any }>>(`/services/${serviceId}`, serviceData),
  
  delete: (serviceId: number) => api.delete<ApiResponse>(`/services/${serviceId}`),
  
  // Pricing Components
  listComponents: (serviceId: number) => api.get<ApiResponse<{ components: any[] }>>(`/services/${serviceId}/components`),
  
  createComponent: (serviceId: number, componentData: any) => api.post<ApiResponse<{ component: any }>>(`/services/${serviceId}/components`, componentData),
  
  getComponent: (componentId: number) => api.get<ApiResponse<{ component: any }>>(`/services/components/${componentId}`),
  
  updateComponent: (componentId: number, componentData: any) => api.put<ApiResponse<{ component: any }>>(`/services/components/${componentId}`, componentData),
  
  deleteComponent: (componentId: number) => api.delete<ApiResponse>(`/services/components/${componentId}`)
};

// Invoices API
export const invoicesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; client_id?: number; date_from?: string; date_to?: string }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/invoices', { params }),
  
  create: (invoiceData: any) => api.post<ApiResponse<{ invoice: any }>>('/invoices', invoiceData),
  
  get: (invoiceId: number) => api.get<ApiResponse<{ invoice: any }>>(`/invoices/${invoiceId}`),
  
  update: (invoiceId: number, invoiceData: any) => api.put<ApiResponse<{ invoice: any }>>(`/invoices/${invoiceId}`, invoiceData),
  
  delete: (invoiceId: number) => api.delete<ApiResponse>(`/invoices/${invoiceId}`),
  
  generatePdf: (invoiceId: number) => api.post<ApiResponse<{ task_id: string }>>(`/invoices/${invoiceId}/pdf`),
  
  downloadPdf: (invoiceId: number) => api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' }),
  
  sendEmail: (invoiceId: number, emailData: { email_to: string; email_subject: string; email_body: string }) =>
    api.post<ApiResponse<{ task_id: string }>>(`/invoices/${invoiceId}/send`, emailData),
  
  // Templates
  listTemplates: () => api.get<ApiResponse<{ templates: any[] }>>('/invoices/templates'),
  
  createTemplate: (templateData: any) => api.post<ApiResponse<{ template: any }>>('/invoices/templates', templateData),
  
  updateTemplate: (templateId: number, templateData: any) => api.put<ApiResponse<{ template: any }>>(`/invoices/templates/${templateId}`, templateData),
  
  deleteTemplate: (templateId: number) => api.delete<ApiResponse>(`/invoices/templates/${templateId}`)
};

// Usage Import API
export const usageApi = {
  import: (formData: FormData) => api.post<ApiResponse<{ import_id: number; task_id: string }>>('/usage/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  listImports: (params?: { page?: number; limit?: number; client_id?: number; status?: string }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/usage/imports', { params }),
  
  getImport: (importId: number) => api.get<ApiResponse<{ import: any }>>(`/usage/imports/${importId}`),
  
  retryImport: (importId: number) => api.put<ApiResponse<{ task_id: string }>>(`/usage/imports/${importId}`),
  
  deleteImport: (importId: number) => api.delete<ApiResponse>(`/usage/imports/${importId}`),
  
  processPending: () => api.post<ApiResponse<{ task_ids: string[] }>>('/usage/process'),
  
  apiImport: (importData: any) => api.post<ApiResponse<{ import_id: number }>>('/usage/api-import', importData),
  
  getServiceMappings: () => api.get<ApiResponse<{ mappings: any }>>('/usage/mappings')
};

// Documents API
export const documentsApi = {
  upload: (formData: FormData) => api.post<ApiResponse<{ document: any }>>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  list: (params?: { page?: number; limit?: number; search?: string; type?: string; client_id?: number; invoice_id?: number }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/documents', { params }),
  
  download: (documentId: number) => api.get(`/documents/${documentId}`, { responseType: 'blob' }),
  
  getInfo: (documentId: number) => api.get<ApiResponse<{ document: any }>>(`/documents/${documentId}/info`),
  
  delete: (documentId: number) => api.delete<ApiResponse>(`/documents/${documentId}`),
  
  getTypes: () => api.get<ApiResponse<{ types: any[] }>>('/documents/types')
};

// Reports API
export const reportsApi = {
  generateClientReport: (reportData: any) => api.post<ApiResponse<any>>('/reports/clients', reportData),
  
  listClientReports: () => api.get<ApiResponse<{ reports: any[] }>>('/reports/clients'),
  
  generateServiceReport: (reportData: any) => api.post<ApiResponse<any>>('/reports/services', reportData),
  
  listServiceReports: () => api.get<ApiResponse<{ reports: any[] }>>('/reports/services'),
  
  generateRevenueReport: (reportData: any) => api.post<ApiResponse<any>>('/reports/revenue', reportData),
  
  listRevenueReports: () => api.get<ApiResponse<{ reports: any[] }>>('/reports/revenue'),
  
  generateAgingReport: () => api.post<ApiResponse<any>>('/reports/aging'),
  
  exportReport: (exportData: any) => api.post<ApiResponse<{ task_id: string }>>('/reports/export', exportData),
  
  generateGstReport: (reportData: any) => api.post<ApiResponse<any>>('/reports/gst-compliance', reportData)
};

// Notifications API
export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; status?: string; user_id?: number; client_id?: number }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/notifications', { params }),
  
  create: (notificationData: any) => api.post<ApiResponse<{ notification: any }>>('/notifications', notificationData),
  
  get: (notificationId: number) => api.get<ApiResponse<{ notification: any }>>(`/notifications/${notificationId}`),
  
  update: (notificationId: number, notificationData: any) => api.put<ApiResponse<{ notification: any }>>(`/notifications/${notificationId}`, notificationData),
  
  delete: (notificationId: number) => api.delete<ApiResponse>(`/notifications/${notificationId}`),
  
  send: (notificationId: number) => api.post<ApiResponse<{ task_id: string }>>(`/notifications/send/${notificationId}`),
  
  createOverdueNotifications: () => api.post<ApiResponse<{ count: number }>>('/notifications/overdue'),
  
  getTypes: () => api.get<ApiResponse<{ types: any[] }>>('/notifications/types')
};

// Analytics API
export const analyticsApi = {
  getSuperAdminAnalytics: () => api.get<ApiResponse<any>>('/analytics/super-admin'),
  
  getClientManagerAnalytics: () => api.get<ApiResponse<any>>('/analytics/client-manager'),
  
  getAuditorAnalytics: () => api.get<ApiResponse<any>>('/analytics/auditor'),
  
  cacheAnalytics: () => api.post<ApiResponse>('/analytics/cache'),
  
  refreshCache: () => api.put<ApiResponse>('/analytics/cache'),
  
  clearCache: () => api.delete<ApiResponse>('/analytics/cache')
};

export default api;