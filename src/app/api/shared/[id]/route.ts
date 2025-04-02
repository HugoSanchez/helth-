import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        console.log('[Shared] Accessing share with ID:', params.id)
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[Shared] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get the collection and check if it exists and is active
        const { data: collection, error: collectionError } = await supabaseAdmin
            .from('shared_collection')
            .select('owner_id, is_active')
            .eq('id', params.id)
            .single()

        if (collectionError || !collection) {
            console.error('[Shared] Collection error:', collectionError)
            return NextResponse.json(
                { error: 'Share not found' },
                { status: 404 }
            )
        }

        // Check if share is active
        if (!collection.is_active) {
            return NextResponse.json(
                { error: 'Share is no longer available' },
                { status: 403 }
            )
        }

        // Prevent owner from accessing their own share
        if (collection.owner_id === user.id) {
            return NextResponse.json(
                { error: 'Cannot access your own share' },
                { status: 403 }
            )
        }

        // Check if anyone has claimed this share
        const { data: accessRecord, error: accessCheckError } = await supabaseAdmin
            .from('shared_collection_access')
            .select('accessed_by_user_id')
            .eq('collection_id', params.id)
            .single()

        // If no one has claimed it yet, try to claim it
        if (!accessRecord) {
            const { error: claimError } = await supabaseAdmin
                .from('shared_collection_access')
                .insert({
                    collection_id: params.id,
                    accessed_by_user_id: user.id,
                })

            if (claimError) {
                console.error('[Shared] Error claiming access:', claimError)
                return NextResponse.json(
                    { error: 'Failed to claim access' },
                    { status: 500 }
                )
            }
        } else if (accessRecord.accessed_by_user_id !== user.id) {
            // Someone else has already claimed this share
            return NextResponse.json(
                { error: 'This share has already been claimed by another user' },
                { status: 403 }
            )
        }

        // Get the shared documents
        const { data: documents, error: documentsError } = await supabaseAdmin
            .from('health_records')
            .select(`
                id,
                record_name,
                display_name,
                record_type,
                doctor_name,
                date,
                summary
            `)
            .in('id', (
                await supabaseAdmin
                    .from('shared_collection_documents')
                    .select('document_id')
                    .eq('collection_id', params.id)
            ).data?.map(d => d.document_id) || [])

        if (documentsError) {
            console.error('[Shared] Documents error:', documentsError)
            return NextResponse.json(
                { error: 'Failed to fetch shared documents' },
                { status: 500 }
            )
        }

        return NextResponse.json({ documents })

    } catch (error) {
        console.error('[Shared] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
