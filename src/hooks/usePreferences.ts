import { useState, useEffect } from 'react'
import { getUserPreferences, saveUserPreferences } from '@/lib/client/db'
import { useSession } from '@/hooks/useSession'
import { Language } from '@/lib/translations'

export interface Preferences {
    displayName: string
    language: Language
}

export function usePreferences() {
    const { session } = useSession()
    const [preferences, setPreferences] = useState<Preferences | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch preferences
    useEffect(() => {
        async function loadPreferences() {
            if (!session?.user.id) {
                setLoading(false)
                return
            }

            try {
                const prefs = await getUserPreferences(session.user.id)
                if (prefs) {
                    setPreferences({
                        displayName: prefs.display_name,
                        language: prefs.language
                    })
                }
            } catch (err) {
                console.error('Error loading preferences:', err)
                setError(err instanceof Error ? err.message : 'Failed to load preferences')
            } finally {
                setLoading(false)
            }
        }

        loadPreferences()
    }, [session])

    // Update preferences
    const updatePreferences = async (newPreferences: Partial<Preferences>) => {
        if (!session?.user.id || !preferences) return

        try {
            setError(null)
            await saveUserPreferences({
                user_id: session.user.id,
                display_name: newPreferences.displayName ?? preferences.displayName,
                language: newPreferences.language ?? preferences.language,
            })

            setPreferences(prev => prev ? { ...prev, ...newPreferences } : null)
        } catch (err) {
            console.error('Error updating preferences:', err)
            setError(err instanceof Error ? err.message : 'Failed to update preferences')
            throw err
        }
    }

    return {
        preferences,
        loading,
        error,
        updatePreferences
    }
}
