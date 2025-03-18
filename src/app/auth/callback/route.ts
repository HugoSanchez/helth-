import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get('code')

	if (code) {
		const cookieStore = cookies()
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

		try {
			await supabase.auth.exchangeCodeForSession(code)

			// After exchanging the code, get the session
			const { data: { session } } = await supabase.auth.getSession()

			if (!session) {
				console.error('No session after code exchange')
				return NextResponse.redirect(new URL('/login', request.url))
			}

			return NextResponse.redirect(new URL('/dashboard', request.url))
			} catch (error) {
				console.error('Auth callback error:', error)
				return NextResponse.redirect(new URL('/login', request.url))
		}
	}

	// No code, redirect to login
	return NextResponse.redirect(new URL('/login', request.url))
}
