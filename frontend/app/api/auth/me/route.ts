import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Mock user data with permissions
const getUserPermissions = (roleName: string) => {
  const permissions: any = {
    'Super Admin': {
      dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      users: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      roles: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      services: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      reports: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      notifications: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      analytics: { can_view: true, can_create: true, can_edit: true, can_delete: true }
    },
    'Client Manager': {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: false },
      services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      reports: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      analytics: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    },
    'Auditor': {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      usage_import: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      documents: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      reports: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      analytics: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    }
  };
  
  return permissions[roleName] || {};
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const user = {
        user_id: decoded.user_id,
        email: decoded.email,
        role_name: decoded.role_name,
        username: decoded.email.split('@')[0]
      };

      const permissions = getUserPermissions(decoded.role_name);

      return NextResponse.json({
        user,
        permissions
      });

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}