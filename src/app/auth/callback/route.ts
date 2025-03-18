import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('Auth callback triggered with code:', code ? 'present' : 'missing')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const sessionResult = await supabase.auth.exchangeCodeForSession(code)
    console.log('Session exchange result:', {
      success: !!sessionResult.data.session,
      error: sessionResult.error
    })

    // Verify session was created
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session after exchange:', {
      exists: !!session,
      user: session?.user?.email
    })
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
