"use client";

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  Clock,
  Plus,
  Settings,
  Shield,
  Eye,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface DashboardData {
  metrics: {
    total_users: number;
    total_clients: number;
    total_invoices: number;
    total_services: number;
    current_month_revenue: number;
    last_month_revenue: number;
    revenue_growth: number;
    assigned_clients?: number;
    total_revenue?: number;
    pending_approvals?: number;
    pending_amount?: number;
    overdue_amount?: number;
    gst_collected?: number;
    gst_invoices?: number;
  };
  charts: {
    revenue_trend: { month: string; revenue: number }[];
    invoice_status: { status: string; count: number }[];
    top_clients: { client_name: string; invoice_count: number; total_revenue: number }[];
  };
  recent_activity: {
    invoice_number: string;
    client_name: string;
    total_amount: number;
    currency: string;
    status: string;
    created_at: string;
  }[];
}

interface User {
  username: string;
  role_name: string;
}

interface DashboardProps {
  user: User;
  initialDashboardData: DashboardData;
}

export default function DashboardClient({ user, initialDashboardData }: DashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [loading, setLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error('Failed to load dashboard data:', response.status, response.statusText);
        setDashboardData(initialDashboardData);
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      setDashboardData(initialDashboardData);
    } finally {
      setLoading(false);
    }
  }, [initialDashboardData]);

  function renderDashboardWithUser(currentUser: User) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Dashboard" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 data-testid="welcome-message" className="text-3xl font-bold text-gray-900">
                    Welcome back, {currentUser.username}!
                  </h2>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge
                      data-testid="user-role-badge"
                      className={
                        currentUser.role_name === 'Super Admin'
                          ? 'bg-blue-100 text-blue-800'
                          : currentUser.role_name === 'Admin'
                          ? 'bg-green-100 text-green-800'
                          : currentUser.role_name === 'Manager'
                          ? 'bg-purple-100 text-purple-800'
                          : currentUser.role_name === 'Accountant'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {currentUser.role_name === 'Super Admin' && <Shield className="w-3 h-3 mr-1" />}
                      {currentUser.role_name === 'Auditor' && <Eye className="w-3 h-3 mr-1" />}
                      {currentUser.role_name}
                    </Badge>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm text-gray-600">AWS Billing Management System</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {currentUser.role_name !== 'Auditor' && (
                    <Button
                      data-testid="create-invoice-quick-action"
                      onClick={() => window.location.href = '/invoices'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Button>
                  )}
                  {currentUser.role_name === 'Super Admin' && (
                    <Button
                      data-testid="settings-quick-action"
                      variant="outline"
                      onClick={() => window.location.href = '/settings'}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  )}
                </div>
              </div>

              {/* Dashboard Content */}
              {renderDashboardContent(currentUser)}

              {/* Recent Activity */}
              {dashboardData.recent_activity && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-orange-600" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardData.recent_activity.map((activity: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Invoice {activity.invoice_number}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {activity.client_name} • {formatCurrency(activity.total_amount, activity.currency)}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  className={
                                    activity.status === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : activity.status === 'sent'
                                      ? 'bg-blue-100 text-blue-800'
                                      : activity.status === 'approved'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {activity.status}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(activity.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {currentUser.role_name !== 'Auditor' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = '/clients'}
                          >
                            <Building2 className="w-4 h-4 mr-1" />
                            Add Client
                          </Button>
                        )}
                        {currentUser.role_name !== 'Auditor' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = '/usage-import'}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Import Usage
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = '/reports'}
                        >
                          <BarChart className="w-4 h-4 mr-1" />
                          View Reports
                        </Button>
                        {currentUser.role_name === 'Super Admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = '/users'}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Manage Users
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderDashboardContent(currentUser: User) {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    switch (currentUser.role_name) {
      case 'Super Admin':
        return renderSuperAdminDashboard();
      case 'Admin':
        return renderAdminDashboard();
      case 'Manager':
        return renderManagerDashboard();
      case 'Accountant':
        return renderAccountantDashboard();
      case 'Auditor':
        return renderAuditorDashboard();
      default:
        return <div>Invalid role</div>;
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue', subtitle }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <p className={`text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trend}% from last month
              </p>
            )}
          </div>
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuperAdminDashboard = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={dashboardData?.metrics?.total_users || 0}
          icon={Users}
          trend={dashboardData?.metrics?.user_growth}
          color="blue"
        />
        <StatCard
          title="Active Clients"
          value={dashboardData?.metrics?.total_clients || 0}
          icon={Building2}
          trend={dashboardData?.metrics?.client_growth}
          color="green"
        />
        <StatCard
          title="Total Invoices"
          value={dashboardData?.metrics?.total_invoices || 0}
          icon={FileText}
          trend={dashboardData?.metrics?.invoice_growth}
          color="purple"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(dashboardData?.metrics?.current_month_revenue || 0)}
          icon={DollarSign}
          trend={dashboardData?.metrics?.revenue_growth}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData?.charts?.revenue_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Invoice Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData?.charts?.invoice_status || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ status, count }) => `${status} (${count})`}
                  >
                    {(dashboardData?.charts?.invoice_status || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-purple-600" />
            Top Clients by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(dashboardData?.charts?.top_clients || []).map((client: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {client.client_name?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.client_name}</p>
                    <p className="text-sm text-gray-600">{client.invoice_count || 0} invoices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(client.total_revenue || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderManagerDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Assigned Clients"
          value={dashboardData?.metrics?.assigned_clients || 0}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="My Invoices"
          value={dashboardData?.metrics?.total_invoices || 0}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Revenue Generated"
          value={formatCurrency(dashboardData?.metrics?.total_revenue || 0)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Pending Approvals"
          value={dashboardData?.metrics?.pending_approvals || 0}
          icon={Clock}
          color="orange"
        />
      </div>
    </>
  );

  const renderAccountantDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(dashboardData?.metrics?.total_revenue || 0)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(dashboardData?.metrics?.pending_amount || 0)}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(dashboardData?.metrics?.overdue_amount || 0)}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="GST Collected"
          value={formatCurrency(dashboardData?.metrics?.gst_collected || 0)}
          icon={Activity}
          color="purple"
        />
      </div>
    </>
  );

  const renderAuditorDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={dashboardData?.metrics?.total_clients || 0}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Invoices"
          value={dashboardData?.metrics?.total_invoices || 0}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(dashboardData?.metrics?.total_revenue || 0)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="GST Invoices"
          value={dashboardData?.metrics?.gst_invoices || 0}
          icon={Activity}
          color="orange"
        />
      </div>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="System Users"
          value={dashboardData?.metrics?.total_users || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Clients"
          value={dashboardData?.metrics?.total_clients || 0}
          icon={Building2}
          color="green"
        />
        <StatCard
          title="Total Invoices"
          value={dashboardData?.metrics?.total_invoices || 0}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(dashboardData?.metrics?.current_month_revenue || 0)}
          icon={DollarSign}
          color="orange"
        />
      </div>
    </>
  );

  return renderDashboardWithUser(user);
}