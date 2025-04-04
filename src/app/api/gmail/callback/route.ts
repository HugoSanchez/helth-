import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
	process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const code = searchParams.get('code');

		if (!code) {
			return NextResponse.redirect(new URL('/settings?error=no_code', request.url));
		}

		// Get Supabase user from the session
		const supabase = createRouteHandlerClient({ cookies });
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			console.error('Auth error:', authError);
			return NextResponse.redirect(new URL('/login', request.url));
		}

		// Exchange code for tokens
		const { tokens } = await oauth2Client.getToken(code);

		// Set credentials to get user info
		oauth2Client.setCredentials(tokens);

		// Get user's email
		const oauth2 = google.oauth2('v2');
		const { data: userInfo } = await oauth2.userinfo.get({ auth: oauth2Client });

		if (!userInfo.email) {
			console.error('Could not get user email from Google');
			return NextResponse.redirect(new URL('/settings?error=no_email', request.url));
		}

		// Store tokens in database for this user
		const { error: dbError } = await supabase
			.from('gmail_accounts')
			.upsert({
				user_id: user.id,
				email: userInfo.email,
				access_token: tokens.access_token!,
				refresh_token: tokens.refresh_token!,
				token_expires_at: new Date(tokens.expiry_date!).toISOString(),
				updated_at: new Date().toISOString()
			});

		if (dbError) {
			console.error('Database error:', dbError);
			return NextResponse.redirect(new URL('/settings?error=db_error', request.url));
		}

		return NextResponse.redirect(new URL('/settings?step=2&scan=true', request.url));
	} catch (error) {
		console.error('Callback error:', error);
		return NextResponse.redirect(new URL('/settings?error=callback_failed', request.url));
	}
}
