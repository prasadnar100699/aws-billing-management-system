"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  BarChart3,
  Loader2
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
    total_users?: number;
    total_clients?: number;
    total_invoices?: number;
    total_services?: number;
    current_month_revenue?: number;
    last_month_revenue?: number;
    revenue_growth?: number;
    assigned_clients?: number;
    total_revenue?: number;
    pending_approvals?: number;
    pending_amount?: number;
    overdue_amount?: number;
    gst_collected?: number;
    gst_invoices?: number;
  };
  charts?: {
    revenue_trend?: { month: string; revenue: number }[];
    invoice_status?: { status: string; count: number }[];
    top_clients?: { client_name: string; invoice_count: number; total_revenue: number }[];
  };
  recent_activity?: {
    invoice_number: string;
    client_name: string;
    total_amount: number;
    currency: string;
    status: string;
    created_at: string;
  }[];
}

/**
 * Dashboard Page Component
 * Renders role-specific dashboard based on user permissions
 */
export default function DashboardPage() {
  const { user, permissions, loading: authLoading, isAuthenticated } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({ metrics: {} });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated()) {
      router.push('/');
      return;
    }

    // Load dashboard data when user is available
    if (user && !authLoading) {
      loadDashboardData();
    }
  }, [user, authLoading, isAuthenticated, router]);

  /**
   * Load dashboard data based on user role
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock dashboard data based on role - replace with actual API calls
      const mockData = generateMockDashboardData(user!.role_name);
      setDashboardData(mockData);
      
    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate mock dashboard data based on user role
   */
  const generateMockDashboardData = (roleName: string): DashboardData => {
    const baseData = {
      revenue_trend: [
        { month: 'Jul 2024', revenue: 45000 },
        { month: 'Aug 2024', revenue: 52000 },
        { month: 'Sep 2024', revenue: 48000 },
        { month: 'Oct 2024', revenue: 61000 },
        { month: 'Nov 2024', revenue: 55000 },
        { month: 'Dec 2024', revenue: 67000 }
      ],
      invoice_status: [
        { status: 'paid', count: 8 },
        { status: 'sent', count: 2 },
        { status: 'approved', count: 1 },
        { status: 'draft', count: 1 }
      ],
      top_clients: [
        { client_name: 'TechCorp Inc', total_revenue: 85000, invoice_count: 12 },
        { client_name: 'CloudTech Solutions', total_revenue: 62000, invoice_count: 8 },
        { client_name: 'DataFlow Ltd', total_revenue: 48000, invoice_count: 6 }
      ]
    };

    switch (roleName) {
      case 'Super Admin':
        return {
          metrics: {
            total_users: 4,
            total_clients: 3,
            total_invoices: 12,
            total_services: 8,
            current_month_revenue: 67000,
            last_month_revenue: 55000,
            revenue_growth: 21.8
          },
          charts: baseData,
          recent_activity: [
            {
              invoice_number: 'TejIT-001-202412-001',
              client_name: 'TechCorp Inc',
              total_amount: 2950,
              currency: 'USD',
              status: 'sent',
              created_at: new Date().toISOString()
            }
          ]
        };

      case 'Client Manager':
        return {
          metrics: {
            assigned_clients: 2,
            total_invoices: 8,
            total_revenue: 45000,
            pending_approvals: 2
          },
          charts: {
            revenue_trend: baseData.revenue_trend.slice(-3)
          }
        };

      case 'Auditor':
        return {
          metrics: {
            total_clients: 3,
            total_invoices: 12,
            total_revenue: 244000,
            gst_invoices: 6
          },
          charts: baseData
        };

      default:
        return { metrics: {} };
    }
  };

  /**
   * Format currency values
   */
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  /**
   * Stat Card Component
   */
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

  /**
   * Render dashboard content based on user role and permissions
   */
  const renderDashboardContent = () => {
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

    switch (user?.role_name) {
      case 'Super Admin':
        return renderSuperAdminDashboard();
      case 'Client Manager':
        return renderManagerDashboard();
      case 'Auditor':
        return renderAuditorDashboard();
      default:
        return renderDefaultDashboard();
    }
  };

  /**
   * Super Admin Dashboard
   */
  const renderSuperAdminDashboard = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={dashboardData.metrics.total_users || 0}
          icon={Users}
          trend={12}
          color="blue"
        />
        <StatCard
          title="Active Clients"
          value={dashboardData.metrics.total_clients || 0}
          icon={Building2}
          trend={8}
          color="green"
        />
        <StatCard
          title="Total Invoices"
          value={dashboardData.metrics.total_invoices || 0}
          icon={FileText}
          trend={15}
          color="purple"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(dashboardData.metrics.current_month_revenue || 0)}
          icon={DollarSign}
          trend={dashboardData.metrics.revenue_growth}
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
                <LineChart data={dashboardData.charts?.revenue_trend || []}>
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
                    data={dashboardData.charts?.invoice_status || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ status, count }) => `${status} (${count})`}
                  >
                    {(dashboardData.charts?.invoice_status || []).map((entry: any, index: number) => (
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
    </>
  );

  /**
   * Client Manager Dashboard
   */
  const renderManagerDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Assigned Clients"
        value={dashboardData.metrics.assigned_clients || 0}
        icon={Building2}
        color="blue"
      />
      <StatCard
        title="My Invoices"
        value={dashboardData.metrics.total_invoices || 0}
        icon={FileText}
        color="green"
      />
      <StatCard
        title="Revenue Generated"
        value={formatCurrency(dashboardData.metrics.total_revenue || 0)}
        icon={DollarSign}
        color="purple"
      />
      <StatCard
        title="Pending Approvals"
        value={dashboardData.metrics.pending_approvals || 0}
        icon={Clock}
        color="orange"
      />
    </div>
  );

  /**
   * Auditor Dashboard
   */
  const renderAuditorDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Clients"
        value={dashboardData.metrics.total_clients || 0}
        icon={Building2}
        color="blue"
      />
      <StatCard
        title="Total Invoices"
        value={dashboardData.metrics.total_invoices || 0}
        icon={FileText}
        color="green"
      />
      <StatCard
        title="Total Revenue"
        value={formatCurrency(dashboardData.metrics.total_revenue || 0)}
        icon={DollarSign}
        color="purple"
      />
      <StatCard
        title="GST Invoices"
        value={dashboardData.metrics.gst_invoices || 0}
        icon={Activity}
        color="orange"
      />
    </div>
  );

  /**
   * Default Dashboard for unknown roles
   */
  const renderDefaultDashboard = () => (
    <Card>
      <CardContent className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Not Available</h3>
        <p className="text-gray-600">Your role does not have access to dashboard features.</p>
      </CardContent>
    </Card>
  );

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !isAuthenticated()) {
    router.push('/');
    return null;
  }

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
                  Welcome back, {user.username}!
                </h2>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge
                    data-testid="user-role-badge"
                    className={
                      user.role_name === 'Super Admin'
                        ? 'bg-blue-100 text-blue-800'
                        : user.role_name === 'Client Manager'
                        ? 'bg-green-100 text-green-800'
                        : user.role_name === 'Auditor'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-purple-100 text-purple-800'
                    }
                  >
                    {user.role_name === 'Super Admin' && <Shield className="w-3 h-3 mr-1" />}
                    {user.role_name === 'Auditor' && <Eye className="w-3 h-3 mr-1" />}
                    {user.role_name === 'Client Manager' && <Users className="w-3 h-3 mr-1" />}
                    {user.role_name}
                  </Badge>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm text-gray-600">AWS Billing Management System</span>
                </div>
              </div>
              <div className="flex space-x-2">
                {/* Show action buttons based on permissions */}
                {permissions.invoices?.can_create && (
                  <Button
                    data-testid="create-invoice-quick-action"
                    onClick={() => router.push('/invoices')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
                {user.role_name === 'Super Admin' && (
                  <Button
                    data-testid="settings-quick-action"
                    variant="outline"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                )}
              </div>
            </div>

            {/* Dashboard Content */}
            {renderDashboardContent()}

            {/* Recent Activity - Only show if user has view permissions */}
            {permissions.invoices?.can_view && dashboardData.recent_activity && (
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

                  {/* Quick Actions based on permissions */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {permissions.clients?.can_create && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/clients')}
                        >
                          <Building2 className="w-4 h-4 mr-1" />
                          Add Client
                        </Button>
                      )}
                      {permissions.usage_import?.can_create && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/usage-import')}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Import Usage
                        </Button>
                      )}
                      {permissions.reports?.can_view && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/reports')}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          View Reports
                        </Button>
                      )}
                      {permissions.users?.can_view && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/users')}
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

            {/* Permission Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && user.role_name === 'Super Admin' && (
              <Card className="border-dashed border-gray-300">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Debug: User Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify({ user, permissions }, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}