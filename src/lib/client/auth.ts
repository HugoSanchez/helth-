import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase } from '@/lib/supabase'

/**
 * Client-side function to check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_preferences')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .single();

    if (error) {
        return false;
    }

    return data?.onboarding_completed ?? false;
}

/**
 * Client-side function to get current session
 */
export async function getCurrentSession() {
    return await supabase.auth.getSession();
}

/**
 * Check if a user has a Gmail account connected
 */
export async function hasGmailConnection(userId: string): Promise<boolean> {
    const { data, error } = await supabase
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
