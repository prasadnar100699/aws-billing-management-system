import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build query string
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/clients?${params}`, {
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
        { error: data.error || 'Failed to fetch clients' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Clients proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json();

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': request.headers.get('X-User-Email') || ''
      },
      body: JSON.stringify(clientData),
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data.data, { status: 201 });
    } else {
      return NextResponse.json(
        { error: data.error || 'Failed to create client' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Create client proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}