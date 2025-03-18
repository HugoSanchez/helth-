interface GoogleTokens {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
}

export async function getTokens(code: string): Promise<GoogleTokens> {
	const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			code,
			client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
			client_secret: process.env.GOOGLE_CLIENT_SECRET,
			redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
			grant_type: 'authorization_code',
		}),
	})

	const tokens = await tokenResponse.json()

	if (!tokenResponse.ok) {
		console.error('Token exchange failed:', tokens)
		throw new Error(tokens.error_description || tokens.error)
	}

	return {
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		expiry_date: Date.now() + (tokens.expires_in * 1000),
	}
}
