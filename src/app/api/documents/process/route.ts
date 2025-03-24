import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/openai'
import { authenticateUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import os from 'os'

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
	const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`)

	try {
		// Authenticate user
		const userId = await authenticateUser(req.headers.get('Authorization'))
		console.log('[Auth] User authenticated:', userId)

		// Get the form data
		const formData = await req.formData()
		const file = formData.get('file') as File

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		// Create storage path
		const timestamp = Date.now()
		const storagePath = `${userId}/${timestamp}_${file.name}`

		// Convert file to buffer for Supabase
		const bytes = await file.arrayBuffer()
		const buffer = Buffer.from(bytes)

		// Upload to Supabase Storage using admin client
		const { error: uploadError } = await supabaseAdmin
			.storage
			.from('health_documents')
			.upload(storagePath, buffer)

		if (uploadError) {
			throw new Error(`Storage upload failed: ${uploadError.message}`)
		}

		console.log('[Storage] File uploaded:', storagePath)

		// Save buffer to temporary file for OpenAI
		fs.writeFileSync(tempFilePath, buffer)

		// Upload to OpenAI using file stream
		console.log('[OpenAI] Uploading file:', file.name)
		const openAiFile = await openai.files.create({
			file: fs.createReadStream(tempFilePath),
			purpose: 'assistants'
		})

		// Clean up temp file
		fs.unlinkSync(tempFilePath)

		console.log('[OpenAI] File uploaded:', openAiFile.id)

		// Analyze the document
		const analysis = await analyzeDocument(openAiFile.id, file.name)
		console.log('[OpenAI] Analysis complete:', {
			type: analysis.record_type,
			name: analysis.record_name
		})

		return NextResponse.json({
			success: true,
			fileUrl: storagePath,
			analysis
		})

	} catch (error) {
		// Clean up temp file in case of error
		if (fs.existsSync(tempFilePath)) {
			fs.unlinkSync(tempFilePath)
		}

		console.error('[Error]', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
		)
	}
}
