import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Create a Supabase client with the service role key
export const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	}
)

// Create a Supabase server client
export async function createSupabaseServerClient() {
	const cookieStore = await cookies()

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
		cookies: {
			getAll() {
			return cookieStore.getAll()
			},
			setAll(cookiesToSet) {
			try {
				cookiesToSet.forEach(({ name, value, options }) =>
				cookieStore.set(name, value, options)
				)
			} catch {
				// The `setAll` method was called from a Server Component.
				// This can be ignored if you have middleware refreshing
				// user sessions.
			}
			},
		},
		}
	)
}



export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	})

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll()
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
					supabaseResponse = NextResponse.next({
						request,
				})
				cookiesToSet.forEach(({ name, value, options }) =>
					supabaseResponse.cookies.set(name, value, options)
				)
				},
			},
		}
	)

	// Do not run code between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	// IMPORTANT: DO NOT REMOVE auth.getUser()

	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (
		!user &&
		!request.nextUrl.pathname.startsWith('/login') &&
		!request.nextUrl.pathname.startsWith('/auth')
	) {
		// no user, potentially respond by redirecting the user to the login page
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		return NextResponse.redirect(url)
	}

	// IMPORTANT: You *must* return the supabaseResponse object as it is.
	// If you're creating a new response object with NextResponse.next() make sure to:
	// 1. Pass the request in it, like so:
	//    const myNewResponse = NextResponse.next({ request })
	// 2. Copy over the cookies, like so:
	//    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
	// 3. Change the myNewResponse object to fit your needs, but avoid changing
	//    the cookies!
	// 4. Finally:
	//    return myNewResponse
	// If this is not done, you may be causing the browser and server to go out
	// of sync and terminate the user's session prematurely!

	return supabaseResponse
}
