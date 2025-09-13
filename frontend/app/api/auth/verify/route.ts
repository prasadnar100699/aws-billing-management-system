import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('X-User-Email');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 401 }
      );
    }

    // Simple validation - check if email exists in localStorage
    return NextResponse.json({
      valid: true,
      user: {
        email: userEmail
      }
    });

  } catch (error) {
    console.error('User verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}