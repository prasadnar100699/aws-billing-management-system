import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

export async function GET(request: NextRequest) {
  try {

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/dashboard`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || ''
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch dashboard data' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Dashboard proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}