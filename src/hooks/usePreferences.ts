import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Language } from '@/lib/translations'

export interface Preferences {
    display_name: string
    language: Language
    onboarding_completed: boolean
}

export function usePreferences() {
    const [preferences, setPreferences] = useState<Preferences | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    // Fetch preferences
    useEffect(() => {
        let mounted = true

        async function loadPreferences() {
            try {
                setError(null)

                // First check if we have a session
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    setLoading(false)
                    return
                }

                // Fetch preferences from our API
                const response = await fetch('/api/preferences')
                if (!response.ok) {
                    throw new Error('Failed to fetch preferences')
                }

                const data = await response.json()

                if (mounted) {
                    setPreferences(data)
                }
            } catch (err) {
                console.error('Error loading preferences:', err)
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load preferences')
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadPreferences()

        return () => {
            mounted = false
        }
    }, [supabase])

    // Update preferences
    const updatePreferences = async (newPreferences: Partial<Preferences>) => {
        try {
            setError(null)

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error('Not authenticated')
            }

            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: session.user.id,
                    ...preferences,
                    ...newPreferences,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

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
