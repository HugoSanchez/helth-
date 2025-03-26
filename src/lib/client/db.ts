import { supabase } from '@/lib/client/supabase';

interface UserPreferences {
    user_id: string;
    display_name: string;
    language: 'en' | 'es';
    onboarding_completed: boolean;
}

/**
 * Creates or updates user preferences
 */
export async function saveUserPreferences(preferences: Omit<UserPreferences, 'onboarding_completed'>) {
    const { error } = await supabase
        .from('user_preferences')
        .upsert([{
            ...preferences,
            onboarding_completed: true
        }], {
            onConflict: 'user_id'
        });

    if (error) {
        throw new Error(`Failed to save preferences: ${error.message}`);
    }
}

/**
 * Gets user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        return null;
    }

    return data;
}
