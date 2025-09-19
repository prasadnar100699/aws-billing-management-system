import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle root path and login page
  if (pathname === '/') {
    // Always allow access to login page
    return NextResponse.next();
  }

  // Allow other public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, let the page handle authentication
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
