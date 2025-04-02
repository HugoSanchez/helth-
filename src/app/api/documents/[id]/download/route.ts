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

        // Use getUser() instead of getSession() for better security
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get the document to verify ownership and get file path
        const { data: document, error: docError } = await supabase
            .from('health_records')
            .select('file_url, record_name')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single()

        if (docError || !document) {
            console.error('[Download] Document error:', docError)
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            )
        }

        // If the file_url is a full URL, extract just the path
        let filePath = document.file_url
        if (filePath.startsWith('http')) {
            try {
                const url = new URL(filePath)
                // Extract the path after /health_documents/
                const match = url.pathname.match(/\/health_documents\/(.+)/)
                if (match) {
                    filePath = match[1]
                }
            } catch (e) {
                console.error('[Download] Error parsing URL:', e)
            }
        }

        // Generate a signed URL that expires in 1 hour with download flag
        const { data, error: signedUrlError } = await supabaseAdmin
            .storage
            .from('health_documents')
            .createSignedUrl(filePath, 3600, {
                download: document.record_name // Use original filename for download
            })

        if (signedUrlError) {
            console.error('[Download] Error creating signed URL:', signedUrlError)
            return NextResponse.json(
                { error: 'Failed to generate download URL' },
                { status: 500 }
            )
        }

        if (!data?.signedUrl) {
            console.error('[Download] No signed URL in response')
            return NextResponse.json(
                { error: 'Failed to generate download URL' },
                { status: 500 }
            )
        }

        return NextResponse.json({ url: data.signedUrl })
    } catch (error) {
        console.error('[Download] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
