import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup'];

// Routes that require specific roles
const roleBasedRoutes = {
  '/users': ['Super Admin'],
  '/roles': ['Super Admin'],
  '/services': ['Super Admin', 'Client Manager'],
  '/usage-import': ['Super Admin', 'Client Manager'],
  '/documents': ['Super Admin', 'Client Manager', 'Auditor'],
  '/reports': ['Super Admin', 'Client Manager', 'Auditor'],
  '/notifications': ['Super Admin', 'Client Manager'],
  '/clients': ['Super Admin', 'Client Manager'],
  '/invoices': ['Super Admin', 'Client Manager', 'Auditor'],
  '/dashboard': ['Super Admin', 'Client Manager', 'Auditor']
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for user data in localStorage (client-side check)
  // Note: This is a simplified approach for demo purposes
  // In production, you'd want proper session management

  // For now, just allow all authenticated routes
  // Role-based access will be handled on the client side
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};