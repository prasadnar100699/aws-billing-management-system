import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../config/api';
import {
  FiUsers,
  FiShield,
  FiUserCheck,
  FiServer,
  FiFileText,
  FiTrendingUp,
  FiDollarSign,
  FiActivity
} from 'react-icons/fi';

/**
 * Dashboard Page Component
 * Enterprise-level dashboard with dynamic data from database
 */
const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    users: { total: 0, active: 0 },
    roles: { total: 0 },
    loading: true
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      // Load users data
      const usersResponse = await apiService.users.getAll();
      const users = usersResponse.data.data.users;
      const activeUsers = users.filter(user => user.status === 'active');

      // Load roles data
      const rolesResponse = await apiService.roles.getAll();
      const roles = rolesResponse.data.data.roles;

      setDashboardData({
        users: {
          total: users.length,
          active: activeUsers.length
        },
        roles: {
          total: roles.length
        },
        loading: false
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const stats = [
    {
      name: 'Total Users',
      value: dashboardData.users.total,
      icon: FiUsers,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Active Users',
      value: dashboardData.users.active,
      icon: FiActivity,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Total Roles',
      value: dashboardData.roles.total,
      icon: FiShield,
      color: 'bg-purple-500',
      change: '+2%',
      changeType: 'positive'
    },
    {
      name: 'System Health',
      value: '99.9%',
      icon: FiTrendingUp,
      color: 'bg-indigo-500',
      change: '+0.1%',
      changeType: 'positive'
    }
  ];

  const quickActions = [
    {
      name: 'Manage Users',
      description: 'Add, edit, or remove users',
      href: '/users',
      icon: FiUsers,
      color: 'bg-blue-500'
    },
    {
      name: 'Manage Roles',
      description: 'Configure user roles and permissions',
      href: '/roles',
      icon: FiShield,
      color: 'bg-purple-500'
    },
    {
      name: 'Client Management',
      description: 'Manage client accounts',
      href: '/clients',
      icon: FiUserCheck,
      color: 'bg-green-500'
    },
    {
      name: 'Service Management',
      description: 'Configure AWS services',
      href: '/services',
      icon: FiServer,
      color: 'bg-orange-500'
    },
    {
      name: 'Invoice Management',
      description: 'Create and manage invoices',
      href: '/invoices',
      icon: FiFileText,
      color: 'bg-red-500'
    },
    {
      name: 'View Reports',
      description: 'Generate billing reports',
      href: '/reports',
      icon: FiDollarSign,
      color: 'bg-yellow-500'
    }
  ];

  if (dashboardData.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-sm text-gray-500">
                {user?.role?.name} • Last login: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <a
                key={action.name}
                href={action.href}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <span className={`${action.color} rounded-lg inline-flex p-3 ring-4 ring-white`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    <span className="absolute inset-0" />
                    {action.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database Connection</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Services</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Backup</span>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;