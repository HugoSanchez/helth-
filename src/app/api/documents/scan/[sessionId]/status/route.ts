import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Configure route to use Node.js runtime
export const runtime = 'nodejs'

export async function GET(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[Status] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get the scan session
        const { data: session, error: sessionError } = await supabase
            .from('scan_sessions')
            .select('*')
            .eq('id', params.sessionId)
            .eq('user_id', user.id)
            .single()

        if (sessionError) {
            console.error('[Status] Error fetching session:', sessionError)
            return NextResponse.json(
                { error: 'Scan session not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            status: session.status,
            total_emails: session.total_emails,
            processed_emails: session.processed_emails,
            total_documents: session.total_documents,
            error: session.error,
            completed_at: session.completed_at
        })

    } catch (error) {
        console.error('[Status] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
