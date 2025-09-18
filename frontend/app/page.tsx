"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Eye, 
  EyeOff, 
  Building2, 
  Shield,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle,
  Cloud,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Listen for auth errors from other components
  useEffect(() => {
    const checkAuthError = () => {
      const authError = localStorage.getItem('auth_error');
      if (authError) {
        toast.error(authError);
        localStorage.removeItem('auth_error');
      }
    };
    
    checkAuthError();
  }, []);

  const checkExistingSession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store user data in localStorage for consistency
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
          localStorage.setItem('auth_token', 'session_active');
        }
        router.push('/dashboard');
      }
    } catch (error) {
      // User not logged in, continue with login page
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data and auth token in localStorage
        if (data.data?.user) {
          localStorage.setItem('user_data', JSON.stringify(data.data.user));
          localStorage.setItem('auth_token', data.data.session_id || 'session_active');
        }
        
        toast.success('Login successful!');
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillSuperAdminCredentials = () => {
    setEmail('admin@100699');
    setPassword('admin@100699');
  };

  const features = [
    {
      icon: Building2,
      title: 'Client Management',
      description: 'Manage AWS clients with multi-account support'
    },
    {
      icon: DollarSign,
      title: 'Invoice Generation',
      description: 'Automated billing with GST compliance'
    },
    {
      icon: Cloud,
      title: 'AWS Integration',
      description: 'Direct AWS usage import and cost tracking'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Comprehensive business insights'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Role-based access control'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Centralized file storage and versioning'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative flex min-h-screen">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12 text-white">
          <div className="flex flex-col justify-between w-full">
            {/* Header */}
            <div>
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Tej IT Solutions</h1>
                  <p className="text-blue-100">AWS Billing Management v2.0</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold mb-4 leading-tight">
                    Enterprise AWS<br />
                    <span className="text-blue-200">Billing Platform</span>
                  </h2>
                  <p className="text-xl text-blue-100 leading-relaxed">
                    Complete billing and management solution for AWS service providers with advanced features.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {features.map((feature, index) => (
                    <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <feature.icon className="w-8 h-8 text-blue-200 mb-3" />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-blue-100">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-blue-100">
                <CheckCircle className="w-5 h-5" />
                <span>Session-based authentication</span>
              </div>
              <div className="flex items-center space-x-4 text-blue-100">
                <Shield className="w-5 h-5" />
                <span>Role-based access control</span>
              </div>
              <div className="flex items-center space-x-4 text-blue-100">
                <Settings className="w-5 h-5" />
                <span>Comprehensive audit trails</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile Header */}
            <div className="lg:hidden text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Tej IT Solutions</h1>
                  <p className="text-sm text-gray-600">AWS Billing Management</p>
                </div>
              </div>
            </div>

            {/* Login Card */}
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-center text-gray-900">
                  System Login
                </CardTitle>
                <p className="text-center text-gray-600">
                  Access your AWS billing management dashboard
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email / Username
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email or username"
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </form>

                {/* Super Admin Quick Access */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Quick Access</span>
                    </div>
                  </div>

                  <div
                    data-testid="super-admin-quick-access"
                    onClick={fillSuperAdminCredentials}
                    className="flex items-center justify-between p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Super Administrator</p>
                        <p className="text-sm text-gray-600">Full system access</p>
                        <p className="text-xs text-blue-600 font-mono">admin@100699</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Click above to auto-fill Super Admin credentials
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Backend: localhost:5002</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Frontend: localhost:3002</span>
              </div>
              <p className="text-xs text-gray-500">
                © 2024 Tej IT Solutions. AWS Billing Management System v2.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}