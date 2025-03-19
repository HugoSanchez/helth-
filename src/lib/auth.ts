import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
