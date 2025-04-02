import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if share exists and hasn't been accessed
        const { data: collection, error: collectionError } = await supabase
            .from('shared_collection')
            .select('id, owner_id, is_accessed, is_active')
            .eq('id', params.id)
            .single()

        if (collectionError || !collection) {
            return NextResponse.json(
                { error: 'Share not found' },
                { status: 404 }
            )
        }

        // Prevent owner from accessing their own share
        if (collection.owner_id === user.id) {
            return NextResponse.json(
                { error: 'Cannot access your own share' },
                { status: 403 }
            )
        }

        // Check if share is still active and hasn't been accessed
        if (!collection.is_active || collection.is_accessed) {
            return NextResponse.json(
                { error: 'Share is no longer available' },
                { status: 403 }
            )
        }

        // Get shared documents
        const { data: documents, error: documentsError } = await supabase
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
                await supabase
                    .from('shared_collection_documents')
                    .select('document_id')
                    .eq('collection_id', collection.id)
            ).data?.map(d => d.document_id) || [])

        if (documentsError) {
            console.error('Error fetching shared documents:', documentsError)
            return NextResponse.json(
                { error: 'Failed to fetch shared documents' },
                { status: 500 }
            )
        }

        // Record the access
        const { error: accessError } = await supabase
            .from('shared_collection_access')
            .insert({
                collection_id: collection.id,
                accessed_by_user_id: user.id,
            })

        if (accessError) {
            console.error('Error recording access:', accessError)
            return NextResponse.json(
                { error: 'Failed to record access' },
                { status: 500 }
            )
        }

        // Mark collection as accessed
        const { error: updateError } = await supabase
            .from('shared_collection')
            .update({ is_accessed: true })
            .eq('id', collection.id)

        if (updateError) {
            console.error('Error updating collection access:', updateError)
            return NextResponse.json(
                { error: 'Failed to update share status' },
                { status: 500 }
            )
        }

        return NextResponse.json({ documents })

    } catch (error) {
        console.error('Error accessing share:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
