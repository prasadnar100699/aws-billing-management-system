import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Mock roles data
const roles = [
  {
    role_id: 1,
    role_name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: {
      dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      users: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      roles: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      services: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      reports: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      notifications: { can_view: true, can_create: true, can_edit: true, can_delete: true }
    }
  },
  {
    role_id: 2,
    role_name: 'Client Manager',
    description: 'Can manage assigned clients and generate invoices',
    permissions: {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: false },
      services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: false },
      usage_import: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      documents: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      reports: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    }
  },
  {
    role_id: 3,
    role_name: 'Auditor',
    description: 'Read-only access for reports and analytics',
    permissions: {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      documents: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      reports: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    }
  }
];

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ roles });

  } catch (error) {
    console.error('List roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}