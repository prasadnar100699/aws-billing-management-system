import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    // Proxy request to Flask backend
    const response = await fetch(`${BACKEND_URL}/auth/demo-credentials`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(data, { status: response.status });
    }

  } catch (error) {
    console.error('Demo credentials proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}