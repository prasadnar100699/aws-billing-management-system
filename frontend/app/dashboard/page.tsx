"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { analyticsApi } from '@/lib/api';
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
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus
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
  BarChart,
  Bar
} from 'recharts';

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      let data;
      
      switch (user?.role_name) {
        case 'Super Admin':
          data = await analyticsApi.getSuperAdminAnalytics();
          break;
        case 'Client Manager':
          data = await analyticsApi.getClientManagerAnalytics();
          break;
        case 'Auditor':
          data = await analyticsApi.getAuditorAnalytics();
          break;
        default:
          setLoading(false);
          return;
      }
      
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            {trend && (
              <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}% from last month
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

  // Render different dashboard based on role
  const renderDashboardContent = () => {
    if (loading || !analyticsData) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    switch (user.role_name) {
      case 'Super Admin':
        return renderSuperAdminDashboard();
      case 'Client Manager':
        return renderClientManagerDashboard();
      case 'Auditor':
        return renderAuditorDashboard();
      default:
        return <div>Invalid role</div>;
    }
  };

  const renderSuperAdminDashboard = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={analyticsData.total_clients}
          icon={Building2}
          trend={8}
          color="blue"
        />
        <StatCard
          title="Total Invoices"
          value={analyticsData.total_invoices}
          icon={FileText}
          trend={12}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(analyticsData.revenue_this_month)}
          icon={DollarSign}
          trend={analyticsData.revenue_growth}
          color="purple"
        />
        <StatCard
          title="Active AWS Accounts"
          value={analyticsData.active_aws_accounts}
          icon={TrendingUp}
          trend={5}
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
                <LineChart data={analyticsData.revenue_trend?.data || []}>
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

        {/* Service Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-green-600" />
              Top Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.service_usage?.slice(0, 5).map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{service.service_name}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(service.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderClientManagerDashboard = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Assigned Clients"
          value={analyticsData.assigned_clients}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Invoices"
          value={analyticsData.total_invoices}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(analyticsData.revenue_this_month)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Pending Invoices"
          value={analyticsData.pending_invoices}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Client Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            Client Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.client_revenue?.map((client: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{client.client_name}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(client.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderAuditorDashboard = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={analyticsData.total_clients}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Invoices"
          value={analyticsData.total_invoices}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analyticsData.total_revenue)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="GST Invoices"
          value={analyticsData.gst_invoices}
          icon={TrendingUp}
          color="orange"
        />
      </div>

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
              <LineChart data={analyticsData.revenue_trend?.data || []}>
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
    </>
  );

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
                <h2 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user.role_name}!
                </h2>
                <p className="text-gray-600 mt-1">
                  Here's what's happening with your AWS billing today.
                </p>
              </div>
              {hasPermission('invoices', 'create') && (
                <Button onClick={() => window.location.href = '/invoices'} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              )}
            </div>

            {/* Dashboard Content */}
            {renderDashboardContent()}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.recent_activity?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                {hasPermission('clients', 'create') && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.location.href = '/clients'}>
                        Add Client
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = '/usage-import'}>
                        Import Usage
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}