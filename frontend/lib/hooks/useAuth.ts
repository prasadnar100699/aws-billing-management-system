import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '../auth';

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
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData.user);
        setPermissions(userData.permissions);
      } else {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const authData = await authService.login(email, password);
      setUser(authData.user);
      
      // Get permissions after login
      const userData = await authService.getCurrentUser();
      if (userData) {
        setPermissions(userData.permissions);
      }
      
      router.push('/dashboard');
      return authData;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setPermissions({});
      router.push('/');
    } catch (error) {
      // Continue with logout even if API call fails
      setUser(null);
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