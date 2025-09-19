import axios from 'axios';

// Frontend API Configuration with Axios
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

// Configure axios defaults
axios.defaults.timeout = 30000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

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

// Base API class with axios
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: any = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        data: options.data,
        params: options.params,
        headers: options.headers,
        ...options
      });

      return response.data;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_data');
          localStorage.removeItem('auth_token');
          window.location.href = '/';
        }
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      throw new Error(errorMessage);
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', data });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', data });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      }
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

  verify: () => apiClient.get('/auth/verify')
};

// ==========================
// Users API
// ==========================
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role_id?: number; status?: string }) =>
    apiClient.get('/api/users', params),

  create: (userData: any) => apiClient.post('/api/users', userData),

  get: (userId: number) => apiClient.get(`/api/users/${userId}`),

  update: (userId: number, userData: any) => apiClient.put(`/api/users/${userId}`, userData),

  delete: (userId: number) => apiClient.delete(`/api/users/${userId}`),

  listRoles: () => apiClient.get('/api/users/roles/list')
};

// ==========================
// Clients API
// ==========================
export const clientsApi = {
  listClients: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get('/api/clients', params),

  create: (clientData: any) => apiClient.post('/api/clients', clientData),

  get: (clientId: number) => apiClient.get(`/api/clients/${clientId}`),

  update: (clientId: number, clientData: any) => apiClient.put(`/api/clients/${clientId}`, clientData),

  delete: (clientId: number, data?: any) => apiClient.post(`/api/clients/${clientId}`, { ...data, _method: 'DELETE' })
};

// ==========================
// Dashboard API
// ==========================
export const dashboardApi = {
  getDashboardData: () => apiClient.get('/api/dashboard')
};

// Export the API client for custom requests
export { apiClient };