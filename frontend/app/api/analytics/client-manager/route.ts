import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    // Proxy the request to Flask backend
    const backendResponse = await fetch(`${BACKEND_URL}/analytics/client-manager`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data, { status: 200 });
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