import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const sessionCookie = request.cookies.get('sb-mock-session')?.value
  let user: any = null
  if (sessionCookie) {
    try {
      user = JSON.parse(decodeURIComponent(sessionCookie))
    } catch (e) {}
  }

  const url = request.nextUrl.clone()
  const path = url.pathname

  // 1. If user is NOT authenticated and they are NOT on the /login page, redirect to /login
  if (!user && path !== '/login') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. If user IS authenticated and they are on the /login page, redirect to dashboard (root)
  if (user && path === '/login') {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 3. Force password change if metadata flags 'must_reset_password' as true
  if (user) {
    const mustResetPassword = user.user_metadata?.must_reset_password === true
    if (mustResetPassword && path !== '/reset-password') {
      url.pathname = '/reset-password'
      return NextResponse.redirect(url)
    }
    // If they don't need a password change but try to visit /reset-password, redirect to dashboard
    if (!mustResetPassword && path === '/reset-password') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
