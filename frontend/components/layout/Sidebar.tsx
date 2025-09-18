"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Building2,
  Users,
  UserCog,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Upload,
  FolderOpen,
  Bell,
  ChevronLeft,
  LogOut,
  Shield,
  Eye,
  Edit3,
  Calculator,
  Home,
  Cog
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    path: '/dashboard',
    module: 'dashboard',
    action: 'view'
  },
  {
    title: 'Client Management',
    icon: Building2,
    path: '/clients',
    module: 'clients',
    action: 'view'
  },
  {
    title: 'Invoice Management',
    icon: FileText,
    path: '/invoices',
    module: 'invoices',
    action: 'view'
  },
  {
    title: 'Usage Import',
    icon: Upload,
    path: '/usage-import',
    module: 'usage_import',
    action: 'view'
  },
  {
    title: 'Service Catalog',
    icon: Settings,
    path: '/services',
    module: 'services',
    action: 'view'
  },
  {
    title: 'Documents',
    icon: FolderOpen,
    path: '/documents',
    module: 'documents',
    action: 'view'
  },
  {
    title: 'Reports & Analytics',
    icon: BarChart3,
    path: '/reports',
    module: 'reports',
    action: 'view'
  },
  {
    title: 'Notifications',
    icon: Bell,
    path: '/notifications',
    module: 'notifications',
    action: 'view'
  },
  {
    title: 'User Management',
    icon: Users,
    path: '/users',
    module: 'users',
    action: 'view',
    superAdminOnly: true
  },
  {
    title: 'Role Management',
    icon: UserCog,
    path: '/roles',
    module: 'roles',
    action: 'view',
    superAdminOnly: true
  },
  {
    title: 'System Settings',
    icon: Cog,
    path: '/settings',
    module: 'settings',
    action: 'view',
    superAdminOnly: true
  }
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'Super Admin':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Admin':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Manager':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Accountant':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Auditor':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'Super Admin':
      return <Shield className="w-3 h-3" />;
    case 'Admin':
      return <Settings className="w-3 h-3" />;
    case 'Manager':
      return <Edit3 className="w-3 h-3" />;
    case 'Accountant':
      return <Calculator className="w-3 h-3" />;
    case 'Auditor':
      return <Eye className="w-3 h-3" />;
    default:
      return <Shield className="w-3 h-3" />;
  }
};

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      // Call logout API
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Clear localStorage and force redirect even if logout fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
      }
      router.push('/');
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    // Check if item requires Super Admin access
    if (item.superAdminOnly && !isSuperAdmin()) {
      return false;
    }
    
    // Check module permission
    if (item.module && item.action) {
      return hasPermission(item.module, item.action);
    }
    
    return true;
  });

  if (!user) {
    return null;
  }

  return (
    <div data-testid="sidebar" className={cn(
      "bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 shadow-sm",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div data-testid="company-logo" className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Tej IT Solutions</h2>
              <p className="text-xs text-gray-500">AWS Billing v2.0</p>
            </div>
          </div>
        )}
        <Button
          data-testid="sidebar-toggle"
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-100"
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className={cn(
          "flex items-center space-x-3",
          isCollapsed && "justify-center"
        )}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          {!isCollapsed && (
            <div data-testid="user-info" className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.username}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                {getRoleIcon(user.role_name)}
                <Badge data-testid="user-role" className={cn("text-xs", getRoleBadgeColor(user.role_name))}>
                  {user.role_name}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <li key={item.path}>
                <Button
                  data-testid={`nav-${item.path.replace('/', '').replace('-', '_') || 'dashboard'}`}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    isCollapsed && "px-2",
                    isActive && "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                  onClick={() => router.push(item.path)}
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    !isCollapsed && "mr-3",
                    isActive && "text-blue-600"
                  )} />
                  {!isCollapsed && (
                    <span className={cn(isActive && "text-blue-700")}>
                      {item.title}
                    </span>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Session Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Session:</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span data-testid="session-status">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Version:</span>
              <span data-testid="app-version">v2.0.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-2 border-t border-gray-200">
        <Button
          data-testid="logout-button"
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
            isCollapsed && "px-2"
          )}
        >
          <LogOut className={cn("w-4 h-4", !isCollapsed && "mr-3")} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );
}