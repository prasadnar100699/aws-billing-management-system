export interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_id: number;
  status: string;
}

export class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const authData = await response.json();
      
      if (response.ok) {
        const user: User = {
          user_id: authData.user_id,
          username: authData.username,
          email: authData.email,
          role_name: authData.role,
          role_id: authData.role_id,
          status: authData.status
        };
        
        // Store auth data
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_data', JSON.stringify(user));
        }
        
        return user;
      }
      
      throw new Error('Invalid response format');
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      this.clearAuthData();
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userData = localStorage.getItem('user_data');
    const authToken = localStorage.getItem('auth_token');
    
    return !!(userData && authToken);
  }

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
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
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('user_data');
  }
}

export const authService = AuthService.getInstance();