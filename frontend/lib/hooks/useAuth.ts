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

interface Session {
  session_id: string;
  expires_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    // Check localStorage first for immediate user data
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      const authToken = localStorage.getItem('auth_token');
      
      if (userData && authToken) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setLoading(false);
          // Still check auth in background
          checkAuth();
          return;
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    }
    
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSession(data.session);
        setPermissions(data.permissions || {});
        
        // Store in localStorage for consistency
        if (typeof window !== 'undefined' && data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
          localStorage.setItem('auth_token', data.session?.session_id || 'session_active');
        }
      } else {
        // Clear any invalid session
        setUser(null);
        setSession(null);
        setPermissions({});
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_data');
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't clear user data on network errors, only on auth errors
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user_data');
        if (!userData) {
          setUser(null);
          setSession(null);
          setPermissions({});
        }
      }
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
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user);
        setSession({ session_id: data.data.session_id, expires_at: '' });
        
        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_data', JSON.stringify(data.data.user));
          localStorage.setItem('auth_token', data.data.session_id);
        }
        
        // Fetch permissions
        await checkAuth();
        
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
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
      }
      
      // Clear localStorage data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
      }
      
      setUser(null);
      setSession(null);
      setPermissions({});
      router.push('/');
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;

    // Super Admin has all permissions
    if (user.role_name === 'Super Admin') return true;

    // Check stored permissions or use role-based fallback
    if (permissions[module]) {
      return permissions[module][`can_${action}`] || false;
    }
    
    // Fallback to role-based permissions
    const rolePermissions = getRolePermissions(user.role_name);
    return rolePermissions[module]?.[action] || false;
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role_name);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role_name === 'Super Admin';
  };
  
  const getRolePermissions = (roleName: string): any => {
    const rolePermissions: any = {
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
    
    return rolePermissions[roleName] || {};
  };

  return {
    user,
    session,
    loading,
    permissions,
    login,
    logout,
    hasPermission,
    hasRole,
    isSuperAdmin,
    isAuthenticated: !!user,
    checkAuth
  };
}