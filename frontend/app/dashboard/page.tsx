"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { analyticsApi } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Shield,
  Globe,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Award,
  Briefcase,
  CreditCard,
  Server,
  Database,
  Cloud
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue', subtitle, badge }: any) => (
    <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              {badge && (
                <Badge className={`${badge.color} text-xs`}>
                  {badge.text}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                )}
                <p className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? '+' : ''}{trend}% from last month
                </p>
              </div>
            )}
          </div>
          <div className={`w-16 h-16 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-2xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon: Icon, onClick, color = 'blue' }: any) => (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuperAdminDashboard = () => (
    <>
      {/* Welcome Section with Live Time */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {user.username}! 👋
            </h1>
            <p className="text-blue-100 text-lg mb-4">
              Here's your AWS billing system overview for today
            </p>
            <div className="flex items-center space-x-6 text-blue-100">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>{currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Shield className="w-16 h-16 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Clients"
          value={analyticsData?.total_clients || 0}
          icon={Building2}
          trend={8}
          color="blue"
          subtitle="Active AWS accounts"
          badge={{ text: 'Growing', color: 'bg-green-100 text-green-800' }}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(analyticsData?.revenue_this_month || 0)}
          icon={DollarSign}
          trend={analyticsData?.revenue_growth || 0}
          color="green"
          subtitle="This month's earnings"
          badge={{ text: 'Target: $75K', color: 'bg-blue-100 text-blue-800' }}
        />
        <StatCard
          title="Total Invoices"
          value={analyticsData?.total_invoices || 0}
          icon={FileText}
          trend={12}
          color="purple"
          subtitle="Generated this month"
        />
        <StatCard
          title="AWS Accounts"
          value={analyticsData?.active_aws_accounts || 0}
          icon={Cloud}
          trend={5}
          color="orange"
          subtitle="Managed accounts"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 border-0 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-xl">
                <TrendingUp className="w-6 h-6 mr-3 text-blue-600" />
                Revenue Trend
              </CardTitle>
              <Badge className="bg-green-100 text-green-800">
                +{analyticsData?.revenue_growth || 0}% Growth
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData?.revenue_trend?.data || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Server className="w-6 h-6 mr-3 text-green-600" />
              Top AWS Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.service_usage?.slice(0, 5).map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                      <Server className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{service.service_name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(service.revenue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status & Client Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Invoice Status */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <PieChart className="w-6 h-6 mr-3 text-purple-600" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={analyticsData?.invoice_status || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ status, count }) => `${status} (${count})`}
                  >
                    {(analyticsData?.invoice_status || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Award className="w-6 h-6 mr-3 text-yellow-600" />
              Top Performing Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.top_clients?.map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.client_name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(client.revenue)}</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Top {index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Zap className="w-6 h-6 mr-3 text-blue-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              title="Add Client"
              description="Onboard new AWS client"
              icon={Building2}
              onClick={() => window.location.href = '/clients'}
              color="blue"
            />
            <QuickActionCard
              title="Create Invoice"
              description="Generate new invoice"
              icon={FileText}
              onClick={() => window.location.href = '/invoices'}
              color="green"
            />
            <QuickActionCard
              title="Import Usage"
              description="Upload AWS CUR data"
              icon={Database}
              onClick={() => window.location.href = '/usage-import'}
              color="purple"
            />
            <QuickActionCard
              title="View Reports"
              description="Analytics & insights"
              icon={BarChart3}
              onClick={() => window.location.href = '/reports'}
              color="orange"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderClientManagerDashboard = () => (
    <>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-teal-700 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Hello, {user.username}! 🚀
            </h1>
            <p className="text-green-100 text-lg mb-4">
              Manage your assigned clients and track their AWS usage
            </p>
            <div className="flex items-center space-x-6 text-green-100">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5" />
                <span>Client Manager Dashboard</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Live Updates</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Users className="w-16 h-16 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Assigned Clients"
          value={analyticsData?.assigned_clients || 0}
          icon={Building2}
          color="blue"
          subtitle="Under your management"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(analyticsData?.revenue_this_month || 0)}
          icon={DollarSign}
          trend={15}
          color="green"
          subtitle="From your clients"
        />
        <StatCard
          title="Total Invoices"
          value={analyticsData?.total_invoices || 0}
          icon={FileText}
          color="purple"
          subtitle="Generated this month"
        />
        <StatCard
          title="Pending Tasks"
          value={analyticsData?.pending_invoices || 0}
          icon={Clock}
          color="orange"
          subtitle="Require attention"
          badge={{ text: 'Urgent', color: 'bg-red-100 text-red-800' }}
        />
      </div>

      {/* Client Performance & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Client Revenue */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Users className="w-6 h-6 mr-3 text-purple-600" />
              Client Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.client_revenue?.map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.client_name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(client.revenue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Progress value={75} className="w-20 h-2 mb-1" />
                    <p className="text-xs text-gray-500">75% of target</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <LineChart className="w-6 h-6 mr-3 text-blue-600" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={analyticsData?.monthly_trend ? 
                  analyticsData.monthly_trend.labels.map((label: string, index: number) => ({
                    month: label,
                    revenue: analyticsData.monthly_trend.data[index]
                  })) : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={4}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderAuditorDashboard = () => (
    <>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-gray-700 via-gray-800 to-slate-800 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Analytics Dashboard 📊
            </h1>
            <p className="text-gray-300 text-lg mb-4">
              Comprehensive insights and audit reports for {user.username}
            </p>
            <div className="flex items-center space-x-6 text-gray-300">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Read-only Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>All Data Visible</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-16 h-16 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Clients"
          value={analyticsData?.total_clients || 0}
          icon={Building2}
          color="blue"
          subtitle="System-wide"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analyticsData?.total_revenue || 0)}
          icon={DollarSign}
          color="green"
          subtitle="All-time earnings"
        />
        <StatCard
          title="Total Invoices"
          value={analyticsData?.total_invoices || 0}
          icon={FileText}
          color="purple"
          subtitle="System-wide"
        />
        <StatCard
          title="GST Compliance"
          value={`${analyticsData?.gst_invoices || 0}/${analyticsData?.total_invoices || 0}`}
          icon={Shield}
          color="orange"
          subtitle="GST invoices"
          badge={{ text: 'Compliant', color: 'bg-green-100 text-green-800' }}
        />
      </div>

      {/* Revenue Analysis */}
      <Card className="border-0 shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <TrendingUp className="w-6 h-6 mr-3 text-blue-600" />
            Revenue Analysis & Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData?.revenue_trend?.data || []}>
                <defs>
                  <linearGradient id="colorAuditorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  fill="url(#colorAuditorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Client Distribution */}
      <Card className="border-0 shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Target className="w-6 h-6 mr-3 text-green-600" />
            Client Revenue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData?.client_distribution?.map((client: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{client.client_name}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(client.revenue)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {((client.revenue / analyticsData.total_revenue) * 100).toFixed(1)}%
                  </p>
                  <Progress 
                    value={(client.revenue / analyticsData.total_revenue) * 100} 
                    className="w-24 h-2 mt-1" 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const QuickActionCard = ({ title, description, icon: Icon, onClick, color = 'blue' }: any) => (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-0" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render different dashboard based on role
  const renderDashboardContent = () => {
    if (loading || !analyticsData) {
      return (
        <div className="space-y-8">
          {/* Loading Welcome Section */}
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl p-8 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
          
          {/* Loading Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Loading Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="h-80 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderDashboardContent()}

            {/* Recent Activity */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Activity className="w-6 h-6 mr-3 text-orange-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.recent_activity?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(activity.date).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* System Status */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                    <Badge className="bg-green-100 text-green-800">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      All Systems Operational
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">Database</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Server className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-800">Backend API</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Running</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Cloud className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-800">AWS Integration</span>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Connected</Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions for authorized users */}
                {hasPermission('clients', 'create') && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/clients'}
                        className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Add Client</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/invoices'}
                        className="flex items-center space-x-2 hover:bg-green-50 hover:border-green-300"
                      >
                        <FileText className="w-4 h-4" />
                        <span>New Invoice</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/usage-import'}
                        className="flex items-center space-x-2 hover:bg-purple-50 hover:border-purple-300"
                      >
                        <Database className="w-4 h-4" />
                        <span>Import Usage</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/reports'}
                        className="flex items-center space-x-2 hover:bg-orange-50 hover:border-orange-300"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>View Reports</span>
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