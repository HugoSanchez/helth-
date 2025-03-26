import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/server/supabase';
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
 * Authenticate user using Supabase and retrieve their user ID
 * Verifies the Bearer token and ensures the user exists
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
