import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/openai'
import { authenticateUser } from '@/lib/auth'
import OpenAI from 'openai'

// Route Segment Config
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Configuration for Next.js API route
 * Disable bodyParser to allow manual handling of multipart form data with formidable.
 * This is required for file uploads to work properly because:
 * 1. Next.js's default body parser interferes with file upload handling
 * 2. Formidable needs raw access to the request body to parse files
 * 3. Setting bodyParser to false lets us manually handle the multipart form data
 */
export const config = {
	api: {
		bodyParser: false,
	},
}

/**
 * Initialize OpenAI client with API key from environment variables.
 * This client will be used for both file uploads and document analysis.
 * The API key must be set in the environment variables as OPENAI_API_KEY.
 */
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
	console.log('[Process] Starting document processing')

	try {
		// Authenticate user
		const userId = await authenticateUser(req.headers.get('Authorization'))
		console.log('[Auth] User authenticated:', userId)

		// Initialize Supabase client
		const supabase = createRouteHandlerClient({ cookies })

		// Get the form data
		const formData = await req.formData()
		const file = formData.get('file') as File

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		// Get file details
		const fileName = file.name

		console.log('[OpenAI] Uploading file:', fileName)
		/**
		// Upload to OpenAI
		const openAiFile = await openai.files.create({
			file: file,
			purpose: 'assistants',
		})

		console.log('[OpenAI] File uploaded:', openAiFile.id)

		// Analyze the document
		const analysis = await analyzeDocument(openAiFile.id, fileName)
		console.log('[OpenAI] Analysis complete:', {
			type: analysis.record_type,
			name: analysis.record_name
		})

		// Save to database
		const dbRecord = {
			user_id: userId,
			...analysis,
			is_processed: true,
			file_url: `${userId}/${Date.now()}_${fileName}`
		}

		const { error } = await supabase.from('health_records').insert([dbRecord])

		if (error) {
			console.error('[DB] Error:', error)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		console.log('[Process] Document processing completed')
		return NextResponse.json({ success: true, analysis })
		*/

	} catch (error) {
		console.error('[Error]', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
		)
	}
}
