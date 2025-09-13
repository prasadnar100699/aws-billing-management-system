import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/me`, {
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
        { error: data.error || 'Failed to get user info' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Auth me proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}