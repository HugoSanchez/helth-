import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase'

export async function POST(request: Request) {
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

        // Get document IDs from request body
        const { documentIds } = await request.json()
        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json(
                { error: 'No documents specified for sharing' },
                { status: 400 }
            )
        }

        // Verify user owns all documents
        const { data: documents, error: documentsError } = await supabase
            .from('health_records')
            .select('id')
            .eq('user_id', user.id)
            .in('id', documentIds)

        if (documentsError) {
            console.error('Error verifying document ownership:', documentsError)
            return NextResponse.json(
                { error: 'Failed to verify document ownership' },
                { status: 500 }
            )
        }

        if (!documents || documents.length !== documentIds.length) {
            return NextResponse.json(
                { error: 'One or more documents not found or not owned by user' },
                { status: 403 }
            )
        }

        // Create share collection
        const { data: collection, error: collectionError } = await supabase
            .from('shared_collection')
            .insert({
                owner_id: user.id,
            })
            .select()
            .single()

        if (collectionError) {
            console.error('Error creating share collection:', collectionError)
            return NextResponse.json(
                { error: 'Failed to create share' },
                { status: 500 }
            )
        }

        // Add documents to collection
        const documentRecords = documentIds.map(documentId => ({
            collection_id: collection.id,
            document_id: documentId,
        }))

        const { error: documentsAddError } = await supabase
            .from('shared_collection_documents')
            .insert(documentRecords)

        if (documentsAddError) {
            console.error('Error adding documents to collection:', documentsAddError)
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

        return NextResponse.json({
            id: collection.id,
            url: `${request.headers.get('origin')}/shared/${collection.id}`
        })

    } catch (error) {
        console.error('Error creating share:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
