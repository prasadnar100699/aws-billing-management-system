import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_id: number;
  status: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (!token || !userData) {
        setLoading(false);
        return;
      }

      // Parse stored user data
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Set basic permissions based on role
      const rolePermissions = getRolePermissions(parsedUser.role_name);
      setPermissions(rolePermissions);
      
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (response.data) {
        // Store auth data
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data));
        
        setUser(response.data);
        
        // Set permissions
        const rolePermissions = getRolePermissions(response.data.role_name);
        setPermissions(rolePermissions);
        
        router.push('/dashboard');
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setPermissions({});
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    
    // Super Admin has all permissions
    if (user.role_name === 'Super Admin') return true;
    
    return permissions[module]?.[`can_${action}`] || false;
  };

  const getRolePermissions = (roleName: string) => {
    const permissions: any = {
      'Super Admin': {
        dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        clients: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        users: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        roles: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        services: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        reports: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        notifications: { can_view: true, can_create: true, can_edit: true, can_delete: true }
      },
      'Client Manager': {
        dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        clients: { can_view: true, can_create: true, can_edit: true, can_delete: false },
        services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
        reports: { can_view: true, can_create: true, can_edit: false, can_delete: false },
        notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false }
      },
      'Auditor': {
        dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        clients: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        invoices: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        usage_import: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        documents: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        reports: { can_view: true, can_create: true, can_edit: false, can_delete: false },
        notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false }
      }
    };
    
    return permissions[roleName] || {};
  };

  return {
    user,
    loading,
    permissions,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user
  };
}