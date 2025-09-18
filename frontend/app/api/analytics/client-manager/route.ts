import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/analytics/client-manager`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': request.headers.get('X-User-Email') || ''
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data.data, { status: 200 });
    } else {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch analytics' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Analytics proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}