import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_id: number;
  status: string;
  last_login?: string;
}

interface Permissions {
  [module: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

/**
 * Authentication Hook
 * Manages user authentication state and permissions
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load user data from localStorage on component mount
    loadStoredAuth();
  }, []);

  /**
   * Load authentication data from localStorage
   */
  const loadStoredAuth = () => {
    try {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user_data');
        const permissionsData = localStorage.getItem('user_permissions');
        
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        }
        
        if (permissionsData) {
          const parsedPermissions = JSON.parse(permissionsData);
          setPermissions(parsedPermissions);
        }
      }
    } catch (error) {
      console.error('Error loading stored auth data:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user with email/username and password
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user data and permissions
        setUser(data.user);
        setPermissions(data.permissions || {});
        
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_data', JSON.stringify(data.user));
          localStorage.setItem('user_permissions', JSON.stringify(data.permissions || {}));
          localStorage.setItem('auth_token', 'authenticated'); // Simple token flag
        }
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user and clear all stored data
   */
  const logout = useCallback(async () => {
    try {
      // Call backend logout (optional, for audit logging)
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user?.user_id })
      }).catch(() => {}); // Ignore errors

    } finally {
      // Clear all auth data regardless of backend response
      clearAuthData();
      router.push('/');
    }
  }, [user, router]);

  /**
   * Clear authentication data from state and localStorage
   */
  const clearAuthData = () => {
    setUser(null);
    setPermissions({});
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_permissions');
      localStorage.removeItem('auth_token');
    }
  };

  /**
   * Check if user has specific permission for a module and action
   */
  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (!user) return false;

    // Super Admin has all permissions
    if (user.role_name === 'Super Admin') return true;

    // Check specific permission
    const modulePermissions = permissions[module];
    if (!modulePermissions) return false;

    return modulePermissions[`can_${action}` as keyof typeof modulePermissions] || false;
  }, [user, permissions]);

  /**
   * Check if user has any of the specified roles
   */
  const hasRole = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role_name);
  }, [user]);

  /**
   * Check if user is Super Admin
   */
  const isSuperAdmin = useCallback((): boolean => {
    return user?.role_name === 'Super Admin';
  }, [user]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback((): boolean => {
    return !!user && !!localStorage.getItem('auth_token');
  }, [user]);

  return {
    user,
    permissions,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    isSuperAdmin,
    isAuthenticated
  };
}