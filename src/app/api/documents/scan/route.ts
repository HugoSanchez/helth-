import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Configure route to use Node.js runtime
export const runtime = 'nodejs'

export async function POST() {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[Scan] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Create a new scan session
        const { data: session, error: sessionError } = await supabase
            .from('scan_sessions')
            .insert({
                user_id: user.id,
                status: 'pending',
                total_emails: 0,
                processed_emails: 0,
                total_documents: 0
            })
            .select()
            .single()

        if (sessionError) {
            console.error('[Scan] Error creating session:', sessionError)
            return NextResponse.json(
                { error: 'Failed to create scan session' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            sessionId: session.id,
            message: 'Scan session created successfully'
        })

    } catch (error) {
        console.error('[Scan] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
