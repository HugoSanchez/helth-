import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies })

        // Use getUser() instead of getSession() for better security
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch user preferences
        const { data: preferences, error: preferencesError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (preferencesError) {
            console.error('Error fetching preferences:', preferencesError)
            return NextResponse.json(
                { error: 'Failed to fetch preferences' },
                { status: 500 }
            )
        }

        return NextResponse.json(preferences || {})
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
