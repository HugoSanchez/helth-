import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase'

// Configure route to use Node.js runtime
export const runtime = 'nodejs'

// Process a batch of emails
async function processBatch(sessionId: string, startIndex: number, batchSize: number = 2) {
    // Simulate finding total of 10 emails if this is the first batch
    if (startIndex === 0) {
        await supabaseAdmin
            .from('scan_sessions')
            .update({
                status: 'scanning',
                total_emails: 10,
                processed_emails: 0
            })
            .eq('id', sessionId)
    }

    // Process this batch
    for (let i = 0; i < batchSize; i++) {
        const currentIndex = startIndex + i
        if (currentIndex >= 10) break // Stop if we've processed all 10 emails

        // Simulate some work (0.5 seconds per email)
        await new Promise(resolve => setTimeout(resolve, 500))

        // Update progress
        await supabaseAdmin
            .from('scan_sessions')
            .update({
                processed_emails: currentIndex + 1,
                total_documents: Math.floor((currentIndex + 1) / 2) // Simulate finding a document every 2 emails
            })
            .eq('id', sessionId)
    }

    // Calculate next batch
    const nextIndex = startIndex + batchSize
    const isComplete = nextIndex >= 10

    if (isComplete) {
        // Mark as complete
        await supabaseAdmin
            .from('scan_sessions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', sessionId)
    }

    return { isComplete, nextIndex }
}

export async function POST(request: Request) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[Process] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get session ID and start index from request
        const { sessionId, startIndex = 0 } = await request.json()

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        // Verify session belongs to user
        const { data: session, error: sessionError } = await supabase
            .from('scan_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single()

        if (sessionError || !session) {
            console.error('[Process] Session verification error:', sessionError)
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            )
        }

        // Process a batch
        const { isComplete, nextIndex } = await processBatch(sessionId, startIndex)

        return NextResponse.json({
            isComplete,
            nextIndex,
            message: isComplete ? 'Processing completed' : 'Batch processed successfully'
        })

    } catch (error) {
        console.error('[Process] Error:', error)
        // Update session with error if we have the session ID
        const { sessionId } = await request.json().catch(() => ({ sessionId: null }))
        if (sessionId) {
            await supabaseAdmin
                .from('scan_sessions')
                .update({
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
                .eq('id', sessionId)
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
