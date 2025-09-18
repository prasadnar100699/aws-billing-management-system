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
      setUser(null);
      setSession(null);
      setPermissions({});
      
      // Clear localStorage on error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
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

    return permissions[module]?.[`can_${action}`] || false;
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role_name);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role_name === 'Super Admin';
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