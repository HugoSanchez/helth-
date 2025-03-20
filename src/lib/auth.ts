import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

/**
 * Backend utility to verify user authentication in API routes
 * Returns the user ID if authenticated, throws error if not
 */
export async function authenticateRequest() {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        throw new Error('Unauthorized')
    }

    return session.user.id
}

/**
 * Backend utility to handle API route authentication
 * Wraps the route handler with authentication check
 */
export function withAuth(handler: (userId: string, req: Request) => Promise<Response>) {
    console.log('withAuth')
	return async (req: Request) => {
        try {
            const userId = await authenticateRequest()
            return handler(userId, req)
        } catch (error) {
            console.error('[Auth] Error:', error)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }
    }
}

/**
 * Frontend utility to make authenticated fetch requests
 * Automatically handles auth headers and error responses
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
            }
        })

        if (response.status === 401) {
            throw new Error('Unauthorized')
        }

        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`)
        }

        return response
    } catch (error) {
        console.error('Request error:', error)
        throw error
    }
}

/**
 * Authenticate user using Supabase and retrieve their user ID
 * Verifies the Bearer token and ensures the user exists
 *
 * @param authHeader - Authorization header from the request
 * @throws Error if unauthorized or token is invalid
 * @returns User ID from Supabase
 *
 * @example
 * const userId = await authenticateUser(request.headers.get('Authorization'));
 */
export async function authenticateUser(authHeader: string | null): Promise<Database['public']['Tables']['gmail_accounts']['Row']['user_id']> {
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Unauthorized: Missing or invalid authorization header');
    }

    const accessToken = authHeader.split(' ')[1];
    const supabase = createServerComponentClient<Database>({ cookies });

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
        throw new Error('Unauthorized: Invalid user token');
    }

    return user.id;
}

/**
 * Retrieve Gmail account details for a specific user
 * Fetches the account from Supabase database
 *
 * @param userId - Supabase user ID
 * @throws Error if Gmail account is not found
 * @returns Gmail account details including access and refresh tokens
 *
 * @example
 * const gmailAccount = await getGmailAccount(userId);
 */
export async function getGmailAccount(userId: string) {
    const { data: gmailAccount, error: gmailError } = await supabaseAdmin
        .from('gmail_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (gmailError || !gmailAccount) {
        throw new Error('Gmail account not found for user');
    }

    return gmailAccount;
}

/**
 * Check if a user has a Gmail account connected
 *
 * @param userId - Supabase user ID
 * @returns Boolean indicating if user has a Gmail account connected
 *
 * @example
 * const isConnected = await hasGmailConnection(userId);
 */
export async function hasGmailConnection(userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('gmail_accounts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error checking Gmail connection:', error);
        return false;
    }

    return !!data;
}
