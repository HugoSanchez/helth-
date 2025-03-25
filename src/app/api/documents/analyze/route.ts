import { NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { analyzeDocument } from '@/lib/anthropic'
import { storeDocument } from '@/lib/db'

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
        // Authenticate user
        const userId = await authenticateUser(req.headers.get('Authorization'))

        // Get and validate the form data
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!file.type.includes('pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
        }

        // Convert file to buffer and base64
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Pdf = buffer.toString('base64')

        // Analyze document with Claude
		console.log('[Claude] Analyzing document...')
        const analysis = await analyzeDocument(base64Pdf)

        // Store document in Supabase
		console.log('[Claude] Storing document...', analysis)
        await storeDocument(userId, file.name, buffer)

        // Return the analysis results
        return NextResponse.json({
            success: true,
            analysis,
            message: "Document analyzed successfully"
        })

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
        )
    }
}
