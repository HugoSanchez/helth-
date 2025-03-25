import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

interface UserPreferences {
    user_id: string;
    display_name: string;
    language: 'en' | 'es';
    onboarding_completed: boolean;
}

/**
 * Stores a PDF file in Supabase storage
 *
 * @param userId - The ID of the user storing the file
 * @param fileName - The name of the file being stored
 * @param buffer - The file content as a Buffer
 * @returns The storage path of the saved file
 */
export async function storeDocument(userId: string, fileName: string, buffer: Buffer) {
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}_${fileName}`;

    const { error: uploadError } = await supabaseAdmin
        .storage
        .from('health_documents')
        .upload(storagePath, buffer, {
            upsert: false,
            contentType: 'application/pdf'
        });

    if (uploadError) {
        throw new Error(`Failed to store document: ${uploadError.message}`);
    }

    return storagePath;
}

/**
 * Creates or updates user preferences
 *
 * @param preferences - User preferences data
 * @returns The saved user preferences
 */
export async function saveUserPreferences(preferences: Omit<UserPreferences, 'onboarding_completed'>) {
    const { error } = await supabase
        .from('user_preferences')
        .insert([{
            ...preferences,
            onboarding_completed: true
        }]);

    if (error) {
        throw new Error(`Failed to save preferences: ${error.message}`);
    }
	return error
}

/**
 * Checks if a user has completed onboarding
 *
 * @param userId - The ID of the user to check
 * @returns Boolean indicating if onboarding is completed
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
 * Gets user preferences
 *
 * @param userId - The ID of the user
 * @returns The user's preferences or null if not found
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
