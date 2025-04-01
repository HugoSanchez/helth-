import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase'

export async function GET(request: Request) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Use getUser() instead of getSession() for better security
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch user's documents
        const { data: documents, error: documentsError } = await supabase
            .from('health_records')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (documentsError) {
            console.error('Error fetching documents:', documentsError)
            return NextResponse.json(
                { error: 'Failed to fetch documents' },
                { status: 500 }
            )
        }

        return NextResponse.json(documents)
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Use getUser() instead of getSession() for better security
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[Delete] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get record IDs from request body
        const { recordIds } = await request.json()

        if (!Array.isArray(recordIds) || recordIds.length === 0) {
            return NextResponse.json(
                { error: 'No records specified for deletion' },
                { status: 400 }
            )
        }

        // First, fetch the records to get their file paths
        const { data: records, error: fetchError } = await supabase
            .from('health_records')
            .select('id, file_url')
            .eq('user_id', user.id)
            .in('id', recordIds)

        if (fetchError) {
            console.error('[Delete] Error fetching records:', fetchError)
            return NextResponse.json(
                { error: 'Failed to fetch records' },
                { status: 500 }
            )
        }

        // Delete files from storage
        for (const record of records || []) {
            if (record.file_url) {
                const { error: storageError } = await supabaseAdmin
                    .storage
                    .from('health_documents')
                    .remove([record.file_url])

                if (storageError) {
                    console.error(`[Delete] Error deleting file for record ${record.id}:`, storageError)
                }
            }
        }

        // Delete records from the database
        const { error: deleteError } = await supabase
            .from('health_records')
            .delete()
            .eq('user_id', user.id)
            .in('id', recordIds)

        if (deleteError) {
            console.error('[Delete] Error deleting records:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete records' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, deletedCount: recordIds.length })
    } catch (error) {
        console.error('[Delete] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
