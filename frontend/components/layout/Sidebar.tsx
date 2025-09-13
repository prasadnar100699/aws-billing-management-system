"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Edit3
} from 'lucide-react';

interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: BarChart3,
    path: '/dashboard',
    roles: ['Super Admin', 'Client Manager', 'Auditor']
  },
  {
    title: 'Client Management',
    icon: Building2,
    path: '/clients',
    roles: ['Super Admin', 'Client Manager']
  },
  {
    title: 'User Management',
    icon: Users,
    path: '/users',
    roles: ['Super Admin']
  },
  {
    title: 'Role Management',
    icon: UserCog,
    path: '/roles',
    roles: ['Super Admin']
  },
  {
    title: 'Service Catalog',
    icon: Settings,
    path: '/services',
    roles: ['Super Admin', 'Client Manager']
  },
  {
    title: 'Invoice Management',
    icon: FileText,
    path: '/invoices',
    roles: ['Super Admin', 'Client Manager', 'Auditor']
  },
  {
    title: 'Usage Import',
    icon: Upload,
    path: '/usage-import',
    roles: ['Super Admin', 'Client Manager']
  },
  {
    title: 'Documents',
    icon: FolderOpen,
    path: '/documents',
    roles: ['Super Admin', 'Client Manager', 'Auditor']
  },
  {
    title: 'Reports',
    icon: BarChart3,
    path: '/reports',
    roles: ['Super Admin', 'Client Manager', 'Auditor']
  },
  {
    title: 'Notifications',
    icon: Bell,
    path: '/notifications',
    roles: ['Super Admin', 'Client Manager']
  }
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'Super Admin':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Client Manager':
      return 'bg-green-100 text-green-800 border-green-200';
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
    case 'Client Manager':
      return <Edit3 className="w-3 h-3" />;
    case 'Auditor':
      return <Eye className="w-3 h-3" />;
    default:
      return <Shield className="w-3 h-3" />;
  }
};

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setCurrentPath(window.location.pathname);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/');
  };

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role_name)
  );

  return (
    <div className={cn(
      "bg-white/90 backdrop-blur-md border-r border-gray-200/50 flex flex-col h-screen transition-all duration-300 shadow-lg",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-sm">
                Tej IT Solutions
              </h2>
              <p className="text-xs text-gray-500">AWS Billing System</p>
            </div>
          </div>
        )}
        <Button
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
      {user && (
        <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          <div className={cn(
            "flex items-center space-x-3",
            isCollapsed && "justify-center"
          )}>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-blue-100">
              <span className="text-white text-sm font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.username}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {getRoleIcon(user.role_name)}
                  <Badge className={cn("text-xs shadow-sm", getRoleBadgeColor(user.role_name))}>
                    {user.role_name}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            
            return (
              <li key={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    isCollapsed && "px-2",
                    isActive && "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-blue-200 shadow-sm"
                  )}
                  onClick={() => {
                    setCurrentPath(item.path);
                    router.push(item.path);
                  }}
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    !isCollapsed && "mr-3",
                    isActive && "text-blue-600 drop-shadow-sm"
                  )} />
                  {!isCollapsed && (
                    <span className={cn(isActive && "text-blue-700 font-medium")}>
                      {item.title}
                    </span>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-200/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200",
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