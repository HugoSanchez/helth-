import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { analyzeDocument } from '@/lib/server/anthropic'
import { storeDocument } from '@/lib/server/db'

// Route Segment Config
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Configuration for Next.js API route
 * Disable bodyParser to allow manual handling of multipart form data
 */
export const config = {
    api: {
        bodyParser: false,
    },
}

/**
 * Handles POST requests for document analysis
 * 1. Authenticates the user
 * 2. Validates and processes the uploaded PDF
 * 3. Analyzes the document using Claude
 * 4. Stores the document in Supabase
 * 5. Returns the analysis results
 */
export async function POST(req: Request) {
    try {
        console.log('[Analyze] Starting document analysis...');
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Use getUser() instead of getSession() for better security
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[Analyze] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get and validate the form data
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            console.error('[Analyze] No file provided')
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!file.type.includes('pdf')) {
            console.error('[Analyze] Invalid file type:', file.type)
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
        }

        console.log('[Analyze] Processing file:', file.name)

        // Convert file to buffer and base64
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Pdf = buffer.toString('base64')

        // Analyze document with Claude
        console.log('[Analyze] Starting Claude analysis...')
        const analysis = await analyzeDocument(base64Pdf)
        console.log('[Analyze] Analysis complete:', analysis)

        // Store document in Supabase
        console.log('[Analyze] Storing document...')
        const storedDoc = await storeDocument(user.id, file.name, buffer, analysis)
        console.log('[Analyze] Document stored successfully:', storedDoc)

        // Return the analysis results
        return NextResponse.json({
            success: true,
            analysis,
            document: storedDoc,
            message: "Document analyzed successfully"
        })

    } catch (error) {
        console.error('[Analyze] Error processing document:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
        )
    }
}
