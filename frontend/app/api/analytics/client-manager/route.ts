import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

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

    if (decoded.role_name !== 'Client Manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Mock analytics data for Client Manager
    const analyticsData = {
      assigned_clients: 2,
      total_invoices: 8,
      revenue_this_month: 45000,
      pending_invoices: 2,
      overdue_invoices: 1,
      client_revenue: [
        { client_name: 'TechCorp Inc', revenue: 28000 },
        { client_name: 'CloudTech Solutions', revenue: 17000 }
      ],
      monthly_trend: {
        labels: ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
        data: [32000, 28000, 41000, 35000, 45000]
      },
      recent_activity: [
        {
          type: 'invoice',
          description: 'Invoice TejIT-001-202412-004 for TechCorp Inc',
          status: 'sent',
          date: new Date().toISOString()
        },
        {
          type: 'invoice',
          description: 'Invoice TejIT-003-202412-003 for CloudTech Solutions',
          status: 'approved',
          date: new Date(Date.now() - 7200000).toISOString()
        }
      ],
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Get client manager analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}