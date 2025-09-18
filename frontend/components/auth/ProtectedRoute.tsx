"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requiredPermission?: {
    module: string;
    action: string;
  };
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission 
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    // Check role-based access
    if (requiredRole && !requiredRole.includes(user.role_name)) {
      // Show error message for insufficient permissions
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_error', 'Insufficient permissions for this page');
      }
      router.push('/dashboard');
      return;
    }

    // Check permission-based access
    if (requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
      // Show error message for insufficient permissions
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_error', 'Insufficient permissions for this page');
      }
      router.push('/dashboard');
      return;
    }

    setAuthorized(true);
  }, [user, loading, requiredRole, requiredPermission, router, hasPermission]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}