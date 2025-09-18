"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  BarChart3,
  Download,
  Calendar as CalendarIcon,
  Filter,
  TrendingUp,
  DollarSign,
  Building2,
  FileText,
  Users,
  PieChart,
  LineChart,
  Activity
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
  Bar
} from 'recharts';

interface ReportData {
  revenue_by_month: Array<{ month: string; revenue: number; invoices: number }>;
  revenue_by_client: Array<{ client_name: string; revenue: number; percentage: number }>;
  service_usage: Array<{ service_name: string; usage: number; cost: number }>;
  gst_summary: {
    total_gst_collected: number;
    gst_registered_clients: number;
    total_clients: number;
  };
  invoice_status: Array<{ status: string; count: number; amount: number }>;
}

interface User {
  role_name: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedReport, setSelectedReport] = useState('revenue_analysis');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date()
  });
  const [clientFilter, setClientFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    loadReportData();
  }, [router]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockData: ReportData = {
        revenue_by_month: [
          { month: 'Jul 2024', revenue: 45000, invoices: 23 },
          { month: 'Aug 2024', revenue: 52000, invoices: 28 },
          { month: 'Sep 2024', revenue: 48000, invoices: 25 },
          { month: 'Oct 2024', revenue: 61000, invoices: 32 },
          { month: 'Nov 2024', revenue: 55000, invoices: 29 },
          { month: 'Dec 2024', revenue: 67000, invoices: 35 }
        ],
        revenue_by_client: [
          { client_name: 'TechCorp Inc', revenue: 85000, percentage: 35 },
          { client_name: 'CloudTech Solutions', revenue: 62000, percentage: 25 },
          { client_name: 'DataFlow Ltd', revenue: 48000, percentage: 20 },
          { client_name: 'StartupXYZ', revenue: 32000, percentage: 13 },
          { client_name: 'Others', revenue: 17000, percentage: 7 }
        ],
        service_usage: [
          { service_name: 'Amazon EC2', usage: 15420, cost: 125000 },
          { service_name: 'Amazon S3', usage: 8750, cost: 45000 },
          { service_name: 'Amazon RDS', usage: 2100, cost: 38000 },
          { service_name: 'Amazon CloudFront', usage: 5200, cost: 22000 },
          { service_name: 'AWS Lambda', usage: 12800, cost: 18000 },
          { service_name: 'Amazon EBS', usage: 3400, cost: 15000 }
        ],
        gst_summary: {
          total_gst_collected: 45600,
          gst_registered_clients: 2,
          total_clients: 4
        },
        invoice_status: [
          { status: 'Paid', count: 28, amount: 185000 },
          { status: 'Sent', count: 8, amount: 42000 },
          { status: 'Approved', count: 5, amount: 28000 },
          { status: 'Draft', count: 3, amount: 15000 },
          { status: 'Overdue', count: 2, amount: 8500 }
        ]
      };
      setReportData(mockData);
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      // Mock export - replace with actual implementation
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Reports & Analytics" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
                <p className="text-gray-600 mt-1">Comprehensive business insights and financial reports</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => handleExportReport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExportReport('excel')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <Button onClick={() => handleExportReport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Report Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="w-64">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue_analysis">Revenue Analysis</SelectItem>
                      <SelectItem value="client_summary">Client Summary</SelectItem>
                      <SelectItem value="service_usage">Service Usage</SelectItem>
                      <SelectItem value="gst_report">GST Report</SelectItem>
                      <SelectItem value="invoice_status">Invoice Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-64 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>

                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-48">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="1">TechCorp Inc</SelectItem>
                      <SelectItem value="2">DataFlow Ltd</SelectItem>
                      <SelectItem value="3">CloudTech Solutions</SelectItem>
                      <SelectItem value="4">StartupXYZ</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={loadReportData} disabled={isLoading}>
                    <Filter className="w-4 h-4 mr-2" />
                    {isLoading ? 'Loading...' : 'Apply Filters'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData ? formatCurrency(reportData.revenue_by_month.reduce((sum, item) => sum + item.revenue, 0)) : '$0'}
                      </p>
                      <p className="text-sm text-green-600 mt-1">+15.2% from last period</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData ? reportData.revenue_by_month.reduce((sum, item) => sum + item.invoices, 0) : 0}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">+8.3% from last period</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData ? reportData.gst_summary.total_clients : 0}
                      </p>
                      <p className="text-sm text-purple-600 mt-1">+2 new this month</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">GST Collected</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData ? formatCurrency(reportData.gst_summary.total_gst_collected) : '$0'}
                      </p>
                      <p className="text-sm text-orange-600 mt-1">
                        {reportData ? reportData.gst_summary.gst_registered_clients : 0} GST clients
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend Chart */}
            {selectedReport === 'revenue_analysis' && reportData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Revenue Trend Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={reportData.revenue_by_month}>
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
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Revenue Distribution */}
            {(selectedReport === 'client_summary' || selectedReport === 'revenue_analysis') && reportData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="w-5 h-5 mr-2 text-green-600" />
                      Revenue by Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={reportData.revenue_by_client}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="revenue"
                            label={({ client_name, percentage }) => `${client_name} (${percentage}%)`}
                          >
                            {reportData.revenue_by_client.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Clients by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.revenue_by_client.map((client, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-gray-900">{client.client_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(client.revenue)}</p>
                            <p className="text-sm text-gray-600">{client.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Service Usage Analysis */}
            {selectedReport === 'service_usage' && reportData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                    AWS Service Usage & Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={reportData.service_usage}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="service_name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="cost" fill="#8B5CF6" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Service</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Usage</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Cost</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.service_usage.map((service, index) => {
                          const totalCost = reportData.service_usage.reduce((sum, s) => sum + s.cost, 0);
                          const percentage = ((service.cost / totalCost) * 100).toFixed(1);
                          return (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-3 px-4 font-medium text-gray-900">{service.service_name}</td>
                              <td className="py-3 px-4 text-right text-gray-600">{service.usage.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right font-medium">{formatCurrency(service.cost)}</td>
                              <td className="py-3 px-4 text-right text-gray-600">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GST Report */}
            {selectedReport === 'gst_report' && reportData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>GST Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="text-center p-6 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">
                          {formatCurrency(reportData.gst_summary.total_gst_collected)}
                        </p>
                        <p className="text-sm text-blue-800 mt-2">Total GST Collected</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {reportData.gst_summary.gst_registered_clients}
                          </p>
                          <p className="text-sm text-green-800 mt-1">GST Registered</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-gray-600">
                            {reportData.gst_summary.total_clients - reportData.gst_summary.gst_registered_clients}
                          </p>
                          <p className="text-sm text-gray-800 mt-1">Non-GST</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>GST Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-green-800 font-medium">GST Registration Rate</span>
                        <Badge className="bg-green-100 text-green-800">
                          {Math.round((reportData.gst_summary.gst_registered_clients / reportData.gst_summary.total_clients) * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-blue-800 font-medium">Average GST per Invoice</span>
                        <span className="font-semibold text-blue-900">
                          {formatCurrency(reportData.gst_summary.total_gst_collected / reportData.revenue_by_month.reduce((sum, item) => sum + item.invoices, 0))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <span className="text-purple-800 font-medium">GST as % of Revenue</span>
                        <span className="font-semibold text-purple-900">
                          {((reportData.gst_summary.total_gst_collected / reportData.revenue_by_month.reduce((sum, item) => sum + item.revenue, 0)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoice Status Report */}
            {selectedReport === 'invoice_status' && reportData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-600" />
                    Invoice Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    {reportData.invoice_status.map((status, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                        <p className="text-sm text-gray-600 mt-1">{status.status}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatCurrency(status.amount)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Count</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Amount</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.invoice_status.map((status, index) => {
                          const totalAmount = reportData.invoice_status.reduce((sum, s) => sum + s.amount, 0);
                          const percentage = ((status.amount / totalAmount) * 100).toFixed(1);
                          return (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-3 px-4">
                                <Badge className={
                                  status.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                  status.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                  status.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {status.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right text-gray-600">{status.count}</td>
                              <td className="py-3 px-4 text-right font-medium">{formatCurrency(status.amount)}</td>
                              <td className="py-3 px-4 text-right text-gray-600">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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