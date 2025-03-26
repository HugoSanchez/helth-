import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/auth/callback

export async function GET(request: Request) {
	try {
		const requestUrl = new URL(request.url)
		const code = requestUrl.searchParams.get('code')

		if (!code) {
			console.error('No code provided in callback')
			return NextResponse.redirect(new URL('/login?error=no_code', request.url))
		}

		const cookieStore = cookies()
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (error) {
			console.error('Error exchanging code for session:', error)
			return NextResponse.redirect(new URL(`/login?error=${error.message}`, request.url))
		}

		// URL to redirect to after sign in process completes
		return NextResponse.redirect(new URL('/dashboard', request.url))
	} catch (error) {
		console.error('Unexpected error in auth callback:', error)
		return NextResponse.redirect(new URL('/login?error=unknown', request.url))
	}
}

