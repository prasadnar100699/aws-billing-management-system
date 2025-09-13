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

    if (decoded.role_name !== 'Auditor') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Mock analytics data for Auditor
    const analyticsData = {
      total_clients: 3,
      total_invoices: 12,
      total_revenue: 244000,
      revenue_this_month: 67000,
      revenue_this_year: 244000,
      gst_invoices: 6,
      overdue_invoices: 1,
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
      invoice_status: [
        { status: 'paid', count: 8 },
        { status: 'sent', count: 2 },
        { status: 'approved', count: 1 },
        { status: 'overdue', count: 1 }
      ],
      client_distribution: [
        { client_name: 'TechCorp Inc', revenue: 85000 },
        { client_name: 'CloudTech Solutions', revenue: 62000 },
        { client_name: 'DataFlow Ltd', revenue: 48000 }
      ],
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Get auditor analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}