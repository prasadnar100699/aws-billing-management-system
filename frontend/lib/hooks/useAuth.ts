import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

/**
 * Authentication Hook
 * Manages user authentication state and permissions with backend integration
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
   * Login user with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const userData = response.data.data.user;
        const userPermissions = response.data.data.permissions || {};
        
        // Store user data and permissions
        setUser(userData);
        setPermissions(userPermissions);
        
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_data', JSON.stringify(userData));
          localStorage.setItem('user_permissions', JSON.stringify(userPermissions));
          localStorage.setItem('auth_token', 'authenticated');
        }
        
        return { success: true, user: userData };
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
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
      // Call backend logout (optional, for audit logging)
      if (user) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {
          user_id: user.user_id
        }).catch(() => {}); // Ignore errors
      }
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