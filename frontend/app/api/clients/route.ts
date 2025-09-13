import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const { searchParams } = new URL(request.url);
    
    // Build query string
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // Proxy the request to Flask backend
    const backendResponse = await fetch(`${BACKEND_URL}/clients?${params}`, {
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
    const authHeader = request.headers.get('Authorization');
    const clientData = await request.json();

    // Proxy the request to Flask backend
    const backendResponse = await fetch(`${BACKEND_URL}/clients`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      return NextResponse.json(data, { status: 201 });
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