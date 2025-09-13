"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Search, Wifi, Database, Server } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
}

interface HeaderProps {
  title: string;
}

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

export function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    backend: 'healthy',
    database: 'healthy',
    lastCheck: new Date()
  });

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Check system status periodically
    const checkSystemStatus = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/health');
        if (response.ok) {
          setSystemStatus({
            backend: 'healthy',
            database: 'healthy',
            lastCheck: new Date()
          });
        }
      } catch (error) {
        setSystemStatus(prev => ({
          ...prev,
          backend: 'error',
          lastCheck: new Date()
        }));
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-sm text-gray-500">
              AWS Client Billing & Management System
            </p>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.backend === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                Backend: {systemStatus.backend === 'healthy' ? 'Online' : 'Offline'}
              </span>
            </div>
          </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* System Status Indicators */}
          <div className="hidden md:flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-1">
              <Server className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">API</span>
              <div className={`w-2 h-2 rounded-full ${systemStatus.backend === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="flex items-center space-x-1">
              <Database className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">DB</span>
              <div className={`w-2 h-2 rounded-full ${systemStatus.database === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>

          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64 bg-white/50 backdrop-blur-sm border-gray-200/50 focus:bg-white focus:border-blue-300"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative hover:bg-blue-50">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm" className="hover:bg-gray-50">
            <Settings className="w-4 h-4" />
          </Button>

          {/* User Badge */}
          {user && (
            <div className="flex items-center space-x-3 border-l border-gray-200/50 pl-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <Badge className={`text-xs ${getRoleBadgeColor(user.role_name)}`}>
                  {user.role_name}
                </Badge>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-blue-100">
                <span className="text-white text-sm font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}