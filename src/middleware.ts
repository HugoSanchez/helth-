import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const { data: { session }, error } = await supabase.auth.getSession()

  // Handle authentication for protected routes
  if (!session && (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    (req.nextUrl.pathname.startsWith('/api/') && !req.nextUrl.pathname.startsWith('/api/auth')) ||
    req.nextUrl.pathname.startsWith('/setup') ||
    req.nextUrl.pathname.startsWith('/settings') ||
    req.nextUrl.pathname.startsWith('/shared/')
  )) {
    const redirectUrl = new URL('/login', req.url)
    // If trying to access a shared document, store the URL to redirect back after login
    if (req.nextUrl.pathname.startsWith('/shared/')) {
      redirectUrl.searchParams.set('redirect_to', req.nextUrl.pathname)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and tries to access auth pages, redirect to dashboard
  // But preserve the redirect_to parameter if it exists
  if (session && req.nextUrl.pathname.startsWith('/login')) {
    const redirectTo = req.nextUrl.searchParams.get('redirect_to')
    const redirectUrl = new URL(redirectTo || '/dashboard', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g. /images/*)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
