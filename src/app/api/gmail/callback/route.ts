import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getTokens } from '@/lib/google'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const code = searchParams.get('code')
	const state = searchParams.get('state')
	const error = searchParams.get('error')

	if (error || !code || !state) {
		console.error('Gmail auth error:', { error, code: !!code, state: !!state })
		return NextResponse.redirect(new URL('/dashboard?error=gmail_auth_failed', request.url))
	}

	try {
		// Decode the access token from state
		const accessToken = atob(state)

		// Initialize regular Supabase client for auth
		const cookieStore = cookies()
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

		// Get user session using the access token
		const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)

		if (userError || !user) {
			console.error('Failed to get user:', userError)
			return NextResponse.redirect(new URL('/login', request.url))
		}

		// Exchange the Google code for tokens
		const tokens = await getTokens(code)

		// Store tokens in Supabase using the admin client
		const { error: dbError } = await supabaseAdmin
			.from('gmail_accounts')
			.upsert({
				user_id: user.id,
				email: user.email!,
				access_token: tokens.access_token!,
				refresh_token: tokens.refresh_token!,
				token_expires_at: new Date(tokens.expiry_date!).toISOString(),
				updated_at: new Date().toISOString(),
			})

		if (dbError) {
			console.error('Database error:', dbError)
			throw dbError
		}

		return NextResponse.redirect(new URL('/dashboard?success=gmail_connected', request.url))
	} catch (error) {
		console.error('Failed to process Gmail callback:', error)
		return NextResponse.redirect(new URL('/dashboard?error=gmail_auth_failed', request.url))
	}
}
