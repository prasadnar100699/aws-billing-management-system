import { authApi } from './api';

export interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_id: number;
  status: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_in: number;
}

export class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await authApi.login({ email, password });
      
      if (response.data) {
        const { user, token, expires_in } = response.data;
        
        // Store auth data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        localStorage.setItem('token_expires', (Date.now() + expires_in * 1000).toString());
        
        return { user, token, expires_in };
      }
      
      throw new Error('Invalid response format');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      this.clearAuthData();
    }
  }

  async getCurrentUser(): Promise<{ user: User; permissions: any } | null> {
    try {
      const response = await authApi.getCurrentUser();
      return response.data || null;
    } catch (error) {
      this.clearAuthData();
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await authApi.refreshToken();
      
      if (response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('token_expires', (Date.now() + response.data.expires_in * 1000).toString());
        return response.data.token;
      }
      
      return null;
    } catch (error) {
      this.clearAuthData();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    const expires = localStorage.getItem('token_expires');
    
    if (!token || !expires) {
      return false;
    }
    
    return Date.now() < parseInt(expires);
  }

  getUser(): User | null {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  hasPermission(module: string, action: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    
    // Super Admin has all permissions
    if (user.role_name === 'Super Admin') return true;
    
    // Check specific permissions based on role
    const permissions = this.getRolePermissions(user.role_name);
    return permissions[module]?.[action] || false;
  }

  private getRolePermissions(roleName: string): any {
    const permissions: any = {
      'Client Manager': {
        dashboard: { view: true },
        clients: { view: true, create: true, edit: true },
        services: { view: true },
        invoices: { view: true, create: true, edit: true, delete: true },
        usage_import: { view: true, create: true, edit: true, delete: true },
        documents: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true },
        notifications: { view: true },
        analytics: { view: true }
      },
      'Auditor': {
        dashboard: { view: true },
        clients: { view: true },
        services: { view: true },
        invoices: { view: true },
        usage_import: { view: true },
        documents: { view: true },
        reports: { view: true, create: true },
        notifications: { view: true },
        analytics: { view: true }
      }
    };
    
    return permissions[roleName] || {};
  }

  private clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expires');
  }
}

export const authService = AuthService.getInstance();