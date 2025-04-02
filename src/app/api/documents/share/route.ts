import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase'

export async function POST(request: Request) {
    try {
        console.log('[Share] Starting share creation process')
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[Share] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }
        console.log('[Share] User authenticated:', user.id)

        // Get document IDs from request body
        const { documentIds } = await request.json()
        console.log('[Share] Requested documents to share:', documentIds)

        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            console.error('[Share] Invalid or empty document IDs')
            return NextResponse.json(
                { error: 'No documents specified for sharing' },
                { status: 400 }
            )
        }

        // Verify user owns all documents
        console.log('[Share] Verifying document ownership')
        const { data: documents, error: documentsError } = await supabase
            .from('health_records')
            .select('id')
            .eq('user_id', user.id)
            .in('id', documentIds)

        if (documentsError) {
            console.error('[Share] Error verifying document ownership:', documentsError)
            return NextResponse.json(
                { error: 'Failed to verify document ownership' },
                { status: 500 }
            )
        }

        if (!documents || documents.length !== documentIds.length) {
            console.error('[Share] Document ownership verification failed:', {
                found: documents?.length || 0,
                requested: documentIds.length
            })
            return NextResponse.json(
                { error: 'One or more documents not found or not owned by user' },
                { status: 403 }
            )
        }

        // Create share collection
        console.log('[Share] Creating share collection')
        const { data: collection, error: collectionError } = await supabase
            .from('shared_collection')
            .insert({
                owner_id: user.id,
                is_active: true,
                is_accessed: false
            })
            .select()
            .single()

        if (collectionError) {
            console.error('[Share] Error creating collection:', collectionError)
            return NextResponse.json(
                { error: 'Failed to create share' },
                { status: 500 }
            )
        }

        console.log('[Share] Created collection:', collection.id)

        // Add documents to collection
        const documentRecords = documentIds.map(documentId => ({
            collection_id: collection.id,
            document_id: documentId,
        }))

        console.log('[Share] Adding documents to collection:', documentRecords)
        const { error: documentsAddError } = await supabase
            .from('shared_collection_documents')
            .insert(documentRecords)

        if (documentsAddError) {
            console.error('[Share] Error adding documents to collection:', documentsAddError)
            // Cleanup the collection if document addition fails
            await supabase
                .from('shared_collection')
                .delete()
                .eq('id', collection.id)

            return NextResponse.json(
                { error: 'Failed to add documents to share' },
                { status: 500 }
            )
        }

        const shareUrl = `${request.headers.get('origin')}/shared/${collection.id}`
        console.log('[Share] Share created successfully:', shareUrl)

        return NextResponse.json({
            id: collection.id,
            url: shareUrl
        })

    } catch (error) {
        console.error('[Share] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
