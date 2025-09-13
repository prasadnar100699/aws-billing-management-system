import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = localStorage.getItem('user_data');

      if (!userData) {
        setLoading(false);
        return;
      }

      // Parse stored user data
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('user_data');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        localStorage.setItem('user_data', JSON.stringify(data));
        setUser(data);

        router.push('/dashboard');
        return data;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: {
          'X-User-Email': user?.email || ''
        }
      });
      
      localStorage.removeItem('user_data');
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API call fails
      localStorage.removeItem('user_data');
      setUser(null);
      router.push('/');
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;

    // Super Admin has all permissions
    if (user.role_name === 'Super Admin') return true;

    // Define role-based permissions
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

    const rolePermissions = permissions[user.role_name] || {};
    return rolePermissions[module]?.[action] || false;
  };

  return {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user
  };
}