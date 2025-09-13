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

    if (decoded.role_name !== 'Super Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Mock analytics data for Super Admin
    const analyticsData = {
      total_clients: 3,
      total_users: 3,
      total_services: 6,
      active_aws_accounts: 6,
      total_invoices: 12,
      revenue_this_month: 67000,
      revenue_last_month: 55000,
      revenue_growth: 21.8,
      revenue_trend: {
        labels: ['Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'],
        data: [
          { month: 'Jul 2024', revenue: 45000 },
          { month: 'Aug 2024', revenue: 52000 },
          { month: 'Sep 2024', revenue: 48000 },
          { month: 'Oct 2024', revenue: 61000 },
          { month: 'Nov 2024', revenue: 55000 },
          { month: 'Dec 2024', revenue: 67000 }
        ]
      },
      top_clients: [
        { client_name: 'TechCorp Inc', revenue: 85000 },
        { client_name: 'CloudTech Solutions', revenue: 62000 },
        { client_name: 'DataFlow Ltd', revenue: 48000 }
      ],
      service_usage: [
        { service_name: 'Amazon EC2', revenue: 125000 },
        { service_name: 'Amazon S3', revenue: 45000 },
        { service_name: 'Amazon RDS', revenue: 38000 },
        { service_name: 'Amazon CloudFront', revenue: 22000 }
      ],
      invoice_status: [
        { status: 'paid', count: 8 },
        { status: 'sent', count: 2 },
        { status: 'approved', count: 1 },
        { status: 'draft', count: 1 }
      ],
      recent_activity: [
        {
          type: 'invoice',
          description: 'Invoice TejIT-001-202412-001 created for TechCorp Inc',
          status: 'completed',
          date: new Date().toISOString()
        },
        {
          type: 'usage_import',
          description: 'Usage import completed for CloudTech Solutions',
          status: 'completed',
          date: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Get super admin analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}