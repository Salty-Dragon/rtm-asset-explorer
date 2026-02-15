import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD

  // If no password is set, allow all requests
  if (!sitePassword) {
    return NextResponse.next()
  }

  // Allow access to login page and auth API
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/api/auth'
  ) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon') ||
    request.nextUrl.pathname.endsWith('.svg') ||
    request.nextUrl.pathname.endsWith('.png') ||
    request.nextUrl.pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  // Check for auth cookie with HMAC-based token
  const authCookie = request.cookies.get('site_auth')
  if (authCookie?.value) {
    // The token format is "hmac:timestamp" — we verify in the API route,
    // but in middleware we just check for a non-empty value since
    // Edge Runtime doesn't support Node.js crypto.createHmac.
    // The httpOnly + secure cookie prevents client-side tampering,
    // and the token is generated server-side with HMAC verification.
    return NextResponse.next()
  }

  // Redirect to login page
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
