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

        // Get user's language preference
        const { data: preferences, error: preferencesError } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', user.id)
            .single()

        if (preferencesError) {
            console.error('[Analyze] Error fetching preferences:', preferencesError)
            // Continue with English as fallback
        }

        const userLanguage = preferences?.language || 'en'

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

        // Convert file to buffer and base64
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Pdf = buffer.toString('base64')

        // Analyze document with Claude
        const analysis = await analyzeDocument(base64Pdf, userLanguage)

        // If analysis returned an error, return it to the client without storing
        if (analysis.status === 'error') {
            console.log('[Analyze] Analysis failed:', analysis.error_type, analysis.error_message);
            return NextResponse.json({
                success: false,
                error: analysis.error_message,
                errorType: analysis.error_type
            }, { status: 422 }) // 422 Unprocessable Entity
        }

        // Store document in Supabase only if analysis was successful
        const storedDoc = await storeDocument(user.id, file.name, buffer, analysis)

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
