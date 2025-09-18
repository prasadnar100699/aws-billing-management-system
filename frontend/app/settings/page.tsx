"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Settings,
  Building2,
  DollarSign,
  Mail,
  Shield,
  Bell,
  FileText,
  Globe,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  Database,
  Cloud
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface SystemSetting {
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string;
  is_editable: boolean;
}

export default function SettingsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  useEffect(() => {
    if (user && isSuperAdmin()) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockSettings: SystemSetting[] = [
        // Company Settings
        { setting_key: 'company_name', setting_value: 'Tej IT Solutions', setting_type: 'string', category: 'company', description: 'Company name for invoices', is_editable: true },
        { setting_key: 'company_address', setting_value: 'Hyderabad, Telangana, India', setting_type: 'string', category: 'company', description: 'Company address', is_editable: true },
        { setting_key: 'company_email', setting_value: 'billing@tejit.com', setting_type: 'string', category: 'company', description: 'Company email', is_editable: true },
        { setting_key: 'company_phone', setting_value: '+91-9876543210', setting_type: 'string', category: 'company', description: 'Company phone', is_editable: true },
        { setting_key: 'company_website', setting_value: 'https://tejit.com', setting_type: 'string', category: 'company', description: 'Company website', is_editable: true },
        { setting_key: 'gst_number', setting_value: '36AABCT1234C1Z5', setting_type: 'string', category: 'company', description: 'Company GST number', is_editable: true },
        
        // Invoice Settings
        { setting_key: 'default_gst_rate', setting_value: '18.00', setting_type: 'number', category: 'invoice', description: 'Default GST rate percentage', is_editable: true },
        { setting_key: 'default_payment_terms', setting_value: '30', setting_type: 'number', category: 'invoice', description: 'Default payment terms in days', is_editable: true },
        { setting_key: 'invoice_number_format', setting_value: 'TejIT-{client_id}-{YYYYMM}-{seq}', setting_type: 'string', category: 'invoice', description: 'Invoice number format', is_editable: true },
        { setting_key: 'default_currency', setting_value: 'USD', setting_type: 'string', category: 'invoice', description: 'Default currency', is_editable: true },
        { setting_key: 'auto_invoice_generation', setting_value: 'true', setting_type: 'boolean', category: 'invoice', description: 'Auto-generate invoices from usage imports', is_editable: true },
        
        // Security Settings
        { setting_key: 'session_timeout_minutes', setting_value: '480', setting_type: 'number', category: 'security', description: 'Session timeout in minutes', is_editable: true },
        { setting_key: 'max_login_attempts', setting_value: '5', setting_type: 'number', category: 'security', description: 'Max login attempts before lockout', is_editable: true },
        { setting_key: 'lockout_duration_minutes', setting_value: '30', setting_type: 'number', category: 'security', description: 'Account lockout duration', is_editable: true },
        
        // Email Settings
        { setting_key: 'email_notifications_enabled', setting_value: 'true', setting_type: 'boolean', category: 'email', description: 'Enable email notifications', is_editable: true },
        { setting_key: 'smtp_host', setting_value: 'smtp.gmail.com', setting_type: 'string', category: 'email', description: 'SMTP server host', is_editable: true },
        { setting_key: 'smtp_port', setting_value: '587', setting_type: 'number', category: 'email', description: 'SMTP server port', is_editable: true },
        { setting_key: 'smtp_username', setting_value: 'billing@tejit.com', setting_type: 'string', category: 'email', description: 'SMTP username', is_editable: true },
        
        // System Settings
        { setting_key: 'file_upload_max_size_mb', setting_value: '50', setting_type: 'number', category: 'system', description: 'Max file upload size in MB', is_editable: true },
        { setting_key: 'backup_enabled', setting_value: 'true', setting_type: 'boolean', category: 'system', description: 'Enable automatic backups', is_editable: true },
        { setting_key: 'audit_log_retention_days', setting_value: '365', setting_type: 'number', category: 'system', description: 'Audit log retention period', is_editable: true }
      ];
      setSettings(mockSettings);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(settings.map(setting => 
      setting.setting_key === key 
        ? { ...setting, setting_value: value }
        : setting
    ));
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const { setting_key, setting_value, setting_type, description, is_editable } = setting;

    if (!is_editable) {
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">{description}</Label>
          <Input value={setting_value} disabled className="bg-gray-50" />
        </div>
      );
    }

    switch (setting_type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">{description}</Label>
              <p className="text-xs text-gray-500">{setting_key}</p>
            </div>
            <Switch
              checked={setting_value === 'true'}
              onCheckedChange={(checked) => updateSetting(setting_key, checked.toString())}
            />
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{description}</Label>
            <Input
              type="number"
              value={setting_value}
              onChange={(e) => updateSetting(setting_key, e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">{setting_key}</p>
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{description}</Label>
            {setting_key.includes('address') || setting_key.includes('terms') ? (
              <Textarea
                value={setting_value}
                onChange={(e) => updateSetting(setting_key, e.target.value)}
                rows={3}
                className="w-full"
              />
            ) : (
              <Input
                value={setting_value}
                onChange={(e) => updateSetting(setting_key, e.target.value)}
                className="w-full"
              />
            )}
            <p className="text-xs text-gray-500">{setting_key}</p>
          </div>
        );
    }
  };

  if (!user || !isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Administrators can access system settings.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={['Super Admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="System Settings" />
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                  <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={loadSettings} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button onClick={handleSaveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    <Save className={`w-4 h-4 mr-2 ${saving ? "animate-pulse" : ""}`} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              {/* Settings Tabs */}
              <Card>
                <CardContent className="p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="company" className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>Company</span>
                      </TabsTrigger>
                      <TabsTrigger value="invoice" className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Invoice</span>
                      </TabsTrigger>
                      <TabsTrigger value="security" className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>Security</span>
                      </TabsTrigger>
                      <TabsTrigger value="email" className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>Email</span>
                      </TabsTrigger>
                      <TabsTrigger value="system" className="flex items-center space-x-2">
                        <Database className="w-4 h-4" />
                        <span>System</span>
                      </TabsTrigger>
                      <TabsTrigger value="aws" className="flex items-center space-x-2">
                        <Cloud className="w-4 h-4" />
                        <span>AWS</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Company Settings */}
                    <TabsContent value="company" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getSettingsByCategory('company').map((setting) => (
                          <div key={setting.setting_key}>
                            {renderSettingInput(setting)}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Invoice Settings */}
                    <TabsContent value="invoice" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getSettingsByCategory('invoice').map((setting) => (
                          <div key={setting.setting_key}>
                            {renderSettingInput(setting)}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Security Settings */}
                    <TabsContent value="security" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getSettingsByCategory('security').map((setting) => (
                          <div key={setting.setting_key}>
                            {renderSettingInput(setting)}
                          </div>
                        ))}
                      </div>
                      
                      <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-orange-800">Security Notice</h4>
                              <p className="text-sm text-orange-700 mt-1">
                                Changes to security settings will affect all users. Session timeout changes require users to re-login.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Email Settings */}
                    <TabsContent value="email" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getSettingsByCategory('email').map((setting) => (
                          <div key={setting.setting_key}>
                            {renderSettingInput(setting)}
                          </div>
                        ))}
                      </div>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Test Email Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-4">
                            <Input placeholder="test@example.com" className="flex-1" />
                            <Button variant="outline">
                              <Mail className="w-4 h-4 mr-2" />
                              Send Test Email
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* System Settings */}
                    <TabsContent value="system" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getSettingsByCategory('system').map((setting) => (
                          <div key={setting.setting_key}>
                            {renderSettingInput(setting)}
                          </div>
                        ))}
                      </div>

                      {/* System Status */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">System Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-800">Database</p>
                              <p className="text-xs text-green-600">Connected</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-800">Sessions</p>
                              <p className="text-xs text-green-600">Active</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-800">File Storage</p>
                              <p className="text-xs text-green-600">Available</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-800">Email Service</p>
                              <p className="text-xs text-green-600">Configured</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* AWS Settings */}
                    <TabsContent value="aws" className="space-y-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">AWS Integration Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Default AWS Region</Label>
                              <Select defaultValue="us-east-1">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                                  <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Currency Conversion API</Label>
                              <Select defaultValue="exchangerate-api">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="exchangerate-api">ExchangeRate-API</SelectItem>
                                  <SelectItem value="fixer">Fixer.io</SelectItem>
                                  <SelectItem value="manual">Manual Entry</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Service Code Mapping</Label>
                            <Textarea
                              placeholder="JSON mapping of AWS service codes to internal services"
                              rows={4}
                              defaultValue='{"AmazonEC2": "Amazon EC2", "AmazonS3": "Amazon S3"}'
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Usage Import Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Auto-process Imports</Label>
                              <Switch defaultChecked />
                            </div>
                            <div className="space-y-2">
                              <Label>Auto-generate Invoices</Label>
                              <Switch defaultChecked />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Import File Validation Rules</Label>
                            <Textarea
                              placeholder="Validation rules for CSV imports"
                              rows={3}
                              defaultValue="Required columns: UsageType, Cost, UsageQuantity, ResourceId"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={loadSettings}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Changes
                </Button>
                <Button onClick={handleSaveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save All Settings'}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}