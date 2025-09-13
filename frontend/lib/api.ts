// Simple API client without JWT dependencies

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

// Helper function to get user email for API calls
const getUserEmail = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      return user.email;
    }
  }
  return '';
};

// Authentication API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }),
  
  logout: () => {
    return fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'X-User-Email': getUserEmail() }
    });
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
};

// Clients API
export const clientsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`/api/clients?${queryParams}`, {
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    
    return response.json();
  },
  
  create: async (clientData: any) => {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Email': getUserEmail()
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create client');
    }
    
    return response.json();
  },
  
  get: async (clientId: number) => {
    const response = await fetch(`/api/clients/${clientId}`, {
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch client');
    }
    
    return response.json();
  },
  
  update: async (clientId: number, clientData: any) => {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Email': getUserEmail()
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update client');
    }
    
    return response.json();
  },
  
  delete: async (clientId: number) => {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'DELETE',
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete client');
    }
    
    return response.json();
  }
};

// Analytics API
export const analyticsApi = {
  getSuperAdminAnalytics: async () => {
    const response = await fetch('/api/analytics/super-admin', { 
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    
    return response.json();
  },
  
  getClientManagerAnalytics: async () => {
    const response = await fetch('/api/analytics/client-manager', { 
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    
    return response.json();
  },
  
  getAuditorAnalytics: async () => {
    const response = await fetch('/api/analytics/auditor', { 
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    
    return response.json();
  }
};

// Users API
export const usersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; role_id?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`/api/users?${queryParams}`, {
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    return response.json();
  },
  
  create: async (userData: any) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Email': getUserEmail()
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    
    return response.json();
  },
  
  update: async (userId: number, userData: any) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Email': getUserEmail()
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
    
    return response.json();
  },
  
  delete: async (userId: number) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
    
    return response.json();
  },
  
  listRoles: async () => {
    const response = await fetch('/api/users/roles', {
      headers: { 'X-User-Email': getUserEmail() }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    
    return response.json();
  }
};