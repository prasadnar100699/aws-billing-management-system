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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

/**
 * Authentication Hook
 * Manages user authentication state and permissions with session-based auth
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status on mount
    checkAuthStatus();
  }, []);

  /**
   * Check authentication status with backend
   */
  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setPermissions(data.permissions || {});
        } else {
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userData = data.user;
        const userPermissions = data.permissions || {};
        
        // Update state
        setUser(userData);
        setPermissions(userPermissions);
        
        return { success: true, user: userData };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user and clear all stored data
   */
  const logout = useCallback(async () => {
    try {
      // Call backend logout
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(() => {}); // Ignore errors
    } finally {
      // Clear auth data
      clearAuthData();
      router.push('/');
    }
  }, [router]);

  /**
   * Clear authentication data from state
   */
  const clearAuthData = () => {
    setUser(null);
    setPermissions({});
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
    return !!user;
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