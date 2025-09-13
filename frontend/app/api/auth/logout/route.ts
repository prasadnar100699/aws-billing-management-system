import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:5002';

export async function POST(request: NextRequest) {
  try {
    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': request.headers.get('X-User-Email') || ''
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data, { status: 200 });
    } else {
      return NextResponse.json(
        { error: data.error || 'Logout failed' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}