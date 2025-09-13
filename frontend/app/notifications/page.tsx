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
import { toast } from 'sonner';
import {
  Bell,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Mail,
  Eye,
  Trash2,
  MarkAsUnread,
  Calendar,
  Building2,
  FileText,
  Upload,
  Settings
} from 'lucide-react';

interface Notification {
  notification_id: number;
  type: 'invoice_due' | 'payment_overdue' | 'import_completed' | 'system_alert' | 'reminder';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: number;
  entity_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
  read_at?: string;
}

interface User {
  role_name: string;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

    loadNotifications();
  }, [router]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter, priorityFilter, statusFilter]);

  const loadNotifications = async () => {
    // Mock data - replace with actual API call
    const mockNotifications: Notification[] = [
      {
        notification_id: 1,
        type: 'payment_overdue',
        title: 'Payment Overdue',
        message: 'Invoice TejIT-001-202412-004 from TechCorp Inc is overdue by 5 days. Total amount: $1,003.00',
        entity_type: 'invoice',
        entity_id: 4,
        entity_name: 'TejIT-001-202412-004',
        priority: 'high',
        is_read: false,
        email_sent: true,
        created_at: '2024-12-15T09:00:00Z'
      },
      {
        notification_id: 2,
        type: 'import_completed',
        title: 'Usage Import Completed',
        message: 'AWS usage import for CloudTech Solutions has been completed successfully. 28,900 records processed with 3,250 failures.',
        entity_type: 'import',
        entity_id: 3,
        entity_name: 'CloudTech Solutions Import',
        priority: 'medium',
        is_read: false,
        email_sent: false,
        created_at: '2024-12-10T14:30:00Z'
      },
      {
        notification_id: 3,
        type: 'invoice_due',
        title: 'Invoice Due Soon',
        message: 'Invoice TejIT-002-202412-002 for DataFlow Ltd is due in 3 days. Amount: $1,800.00',
        entity_type: 'invoice',
        entity_id: 2,
        entity_name: 'TejIT-002-202412-002',
        priority: 'medium',
        is_read: true,
        email_sent: true,
        created_at: '2024-12-08T10:15:00Z',
        read_at: '2024-12-08T11:30:00Z'
      },
      {
        notification_id: 4,
        type: 'system_alert',
        title: 'System Backup Completed',
        message: 'Daily system backup completed successfully. Database size: 2.3GB, Documents: 1.8GB',
        priority: 'low',
        is_read: true,
        email_sent: false,
        created_at: '2024-12-07T02:00:00Z',
        read_at: '2024-12-07T09:15:00Z'
      },
      {
        notification_id: 5,
        type: 'reminder',
        title: 'Monthly Invoice Generation',
        message: 'Reminder: Generate monthly invoices for all clients. 4 clients pending invoice generation.',
        priority: 'medium',
        is_read: false,
        email_sent: false,
        created_at: '2024-12-01T08:00:00Z'
      },
      {
        notification_id: 6,
        type: 'system_alert',
        title: 'High Storage Usage',
        message: 'Document storage is at 85% capacity. Consider archiving old documents or upgrading storage.',
        priority: 'high',
        is_read: false,
        email_sent: true,
        created_at: '2024-11-28T16:45:00Z'
      },
      {
        notification_id: 7,
        type: 'import_completed',
        title: 'Usage Import Failed',
        message: 'AWS usage import for TechCorp Inc failed due to invalid CSV format. Please check the file and retry.',
        entity_type: 'import',
        entity_id: 4,
        entity_name: 'TechCorp Inc Import',
        priority: 'high',
        is_read: true,
        email_sent: true,
        created_at: '2024-11-25T11:20:00Z',
        read_at: '2024-11-25T12:00:00Z'
      },
      {
        notification_id: 8,
        type: 'reminder',
        title: 'GST Filing Reminder',
        message: 'Quarterly GST filing is due in 7 days. Total GST collected: $45,600.00',
        priority: 'critical',
        is_read: false,
        email_sent: true,
        created_at: '2024-11-20T09:30:00Z'
      }
    ];
    setNotifications(mockNotifications);
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === typeFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(notification => notification.priority === priorityFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'read') {
        filtered = filtered.filter(notification => notification.is_read);
      } else if (statusFilter === 'unread') {
        filtered = filtered.filter(notification => !notification.is_read);
      }
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      // Mock API call - replace with actual implementation
      setNotifications(notifications.map(notification => 
        notification.notification_id === notificationId 
          ? { ...notification, is_read: true, read_at: new Date().toISOString() }
          : notification
      ));
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAsUnread = async (notificationId: number) => {
    try {
      // Mock API call - replace with actual implementation
      setNotifications(notifications.map(notification => 
        notification.notification_id === notificationId 
          ? { ...notification, is_read: false, read_at: undefined }
          : notification
      ));
      toast.success('Notification marked as unread');
    } catch (error) {
      toast.error('Failed to mark notification as unread');
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      // Mock API call - replace with actual implementation
      setNotifications(notifications.filter(notification => notification.notification_id !== notificationId));
      toast.success('Notification deleted successfully');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mock API call - replace with actual implementation
      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: true,
        read_at: notification.read_at || new Date().toISOString()
      })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invoice_due':
        return FileText;
      case 'payment_overdue':
        return AlertTriangle;
      case 'import_completed':
        return Upload;
      case 'system_alert':
        return Settings;
      case 'reminder':
        return Bell;
      default:
        return Info;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
      medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      critical: { color: 'bg-red-100 text-red-800', label: 'Critical' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      invoice_due: { color: 'bg-blue-100 text-blue-800', label: 'Invoice Due' },
      payment_overdue: { color: 'bg-red-100 text-red-800', label: 'Payment Overdue' },
      import_completed: { color: 'bg-green-100 text-green-800', label: 'Import Completed' },
      system_alert: { color: 'bg-purple-100 text-purple-800', label: 'System Alert' },
      reminder: { color: 'bg-yellow-100 text-yellow-800', label: 'Reminder' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.reminder;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Notifications" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                <p className="text-gray-600 mt-1">
                  Stay updated with system alerts, reminders, and important updates
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-red-100 text-red-800">
                      {unreadCount} unread
                    </Badge>
                  )}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button onClick={handleMarkAllAsRead} className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All as Read
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                    </div>
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Unread</p>
                      <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Critical</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {notifications.filter(n => n.priority === 'critical').length}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Email Sent</p>
                      <p className="text-2xl font-bold text-green-600">
                        {notifications.filter(n => n.email_sent).length}
                      </p>
                    </div>
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="invoice_due">Invoice Due</SelectItem>
                      <SelectItem value="payment_overdue">Payment Overdue</SelectItem>
                      <SelectItem value="import_completed">Import Completed</SelectItem>
                      <SelectItem value="system_alert">System Alert</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications List */}
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                return (
                  <Card 
                    key={notification.notification_id} 
                    className={`hover:shadow-md transition-shadow ${
                      !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          notification.priority === 'critical' ? 'bg-red-100' :
                          notification.priority === 'high' ? 'bg-orange-100' :
                          notification.priority === 'medium' ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          <IconComponent className={`w-6 h-6 ${
                            notification.priority === 'critical' ? 'text-red-600' :
                            notification.priority === 'high' ? 'text-orange-600' :
                            notification.priority === 'medium' ? 'text-blue-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                {getTypeBadge(notification.type)}
                                {getPriorityBadge(notification.priority)}
                                {notification.email_sent && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <Mail className="w-3 h-3 mr-1" />
                                    Email Sent
                                  </Badge>
                                )}
                                {!notification.is_read && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {!notification.is_read ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.notification_id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleMarkAsUnread(notification.notification_id)}
                                >
                                  <MarkAsUnread className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteNotification(notification.notification_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className={`text-sm mb-3 ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          
                          {notification.entity_name && (
                            <div className="flex items-center text-sm text-gray-500 mb-3">
                              <Building2 className="w-4 h-4 mr-1" />
                              Related to: {notification.entity_name}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(notification.created_at).toLocaleString()}
                            </div>
                            {notification.read_at && (
                              <div>
                                Read on {new Date(notification.read_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredNotifications.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                  <p className="text-gray-600">
                    {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'You\'re all caught up! No new notifications at this time.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}