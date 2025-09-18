import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    // Check for session ID or fallback to localStorage check
    if (!sessionId) {
      // For development, allow requests if we detect auth token in headers
      const authRequired = request.headers.get('X-Auth-Required');
      if (authRequired) {
        // Return mock data for development
        const mockDashboardData = {
          metrics: {
            total_users: 4,
            total_clients: 3,
            total_invoices: 12,
            total_services: 8,
            current_month_revenue: 67000,
            last_month_revenue: 55000,
            revenue_growth: 21.8
          },
          charts: {
            revenue_trend: [
              { month: 'Jul 2024', revenue: 45000 },
              { month: 'Aug 2024', revenue: 52000 },
              { month: 'Sep 2024', revenue: 48000 },
              { month: 'Oct 2024', revenue: 61000 },
              { month: 'Nov 2024', revenue: 55000 },
              { month: 'Dec 2024', revenue: 67000 }
            ],
            invoice_status: [
              { status: 'paid', count: 8 },
              { status: 'sent', count: 2 },
              { status: 'approved', count: 1 },
              { status: 'draft', count: 1 }
            ],
            top_clients: [
              { client_name: 'TechCorp Inc', total_revenue: 85000, invoice_count: 12 },
              { client_name: 'CloudTech Solutions', total_revenue: 62000, invoice_count: 8 },
              { client_name: 'DataFlow Ltd', total_revenue: 48000, invoice_count: 6 }
            ]
          },
          recent_activity: [
            {
              invoice_number: 'TejIT-001-202412-001',
              client_name: 'TechCorp Inc',
              total_amount: 2950,
              currency: 'USD',
              status: 'sent',
              created_at: new Date().toISOString()
            }
          ]
        };
        
        return NextResponse.json(mockDashboardData, { status: 200 });
      }
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'X-Forwarded-For': request.ip || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data.data, { status: 200 });
    } else {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch dashboard data' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Dashboard proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}