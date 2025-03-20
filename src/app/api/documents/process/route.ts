import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/openai'
import OpenAI from 'openai'
import formidable from 'formidable'
import { Readable } from 'stream'
import { IncomingMessage } from 'http'
import { Fields, Files } from 'formidable'
import fs from 'fs'

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

/**
 * POST endpoint to process medical documents
 * This endpoint handles two distinct scenarios:
 * 1. Process an existing record (using recordId):
 *    - Fetches the file from Supabase storage
 *    - Sends it to OpenAI for analysis
 *    - Updates the existing record with new analysis
 *
 * 2. Process a new file upload:
 *    - Receives a new PDF file
 *    - Uploads it to both Supabase storage and OpenAI
 *    - Creates a new record with the analysis
 *
 * @param req - The incoming HTTP request containing either a recordId or a file
 * @returns NextResponse with either success and analysis data or an error message
 */
export async function POST(req: Request) {
	console.log('[Process] Starting document processing')

	try {
		// Initialize Supabase client and verify authentication
		// createRouteHandlerClient automatically handles token refresh and cookie management
		const supabase = createRouteHandlerClient({ cookies })
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) {
			console.log('[Auth] Unauthorized access attempt')
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}
		console.log('[Auth] User authenticated:', session.user.id)

		// Parse multipart form data using formidable
		// This process involves:
		// 1. Converting the request to a format formidable can handle
		// 2. Parsing both regular fields (like recordId) and file uploads
		// 3. Handling the async nature of form parsing
		console.log('[Form] Parsing form data')
		const form = formidable({})
		const buffer = Buffer.from(await req.arrayBuffer())
		// Cast to IncomingMessage because formidable expects Node.js request object
		const readable = Readable.from(buffer) as unknown as IncomingMessage
		const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
			form.parse(readable, (err, fields, files) => {
				if (err) reject(err)
				else resolve([fields, files])
			})
		})

		// Extract recordId and file from form data
		// recordId will be present for existing records, file for new uploads
		const recordId = fields.recordId?.[0]
		const pdfFile = files.file?.[0]
		console.log('[Process] Request details:', { recordId, hasFile: !!pdfFile })

		// Initialize variables for file processing
		// These will be set differently based on whether we're processing
		// an existing record or a new upload
		let fileStream
		let fileName

		// SCENARIO 1: Process existing record
		// This handles cases where we're reprocessing a document that's already in our system
		if (recordId) {
			console.log('[DB] Fetching existing record:', recordId)
			// Get the record details from Supabase
			const { data: record } = await supabase
				.from('health_records')
				.select('file_url, record_name')
				.eq('id', recordId)
				.single()

			if (!record) {
				console.log('[DB] Record not found:', recordId)
				return NextResponse.json({ error: 'Record not found' }, { status: 404 })
			}

			// Download file from Supabase Storage
			// This gets the actual PDF file that was previously uploaded
			console.log('[Storage] Downloading file:', record.file_url)
			const { data } = await supabase.storage.from('documents').download(record.file_url)
			if (!data) {
				console.log('[Storage] File not found:', record.file_url)
				return NextResponse.json({ error: 'File not found' }, { status: 404 })
			}

			// Convert Blob to file stream
			// This involves:
			// 1. Converting Blob to ArrayBuffer
			// 2. Writing to a temporary file
			// 3. Creating a readable stream for OpenAI
			const arrayBuffer = await data.arrayBuffer()
			const tempPath = `/tmp/${record.file_url}`
			await fs.promises.writeFile(tempPath, Buffer.from(arrayBuffer))
			fileStream = fs.createReadStream(tempPath)
			fileName = record.record_name
			console.log('[Process] File prepared:', fileName)

		// SCENARIO 2: Process new file upload
		// This handles new documents being uploaded to the system
		} else if (pdfFile) {
			console.log('[Process] Processing new upload:', pdfFile.originalFilename)
			// Create a readable stream directly from the uploaded file
			fileStream = fs.createReadStream(pdfFile.filepath)
			fileName = pdfFile.originalFilename || 'unknown'
		} else {
			// Neither recordId nor file was provided - this is an invalid request
			console.log('[Error] No file or record ID provided')
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		// Upload file to OpenAI for analysis
		// This creates a file in OpenAI's system that we can then analyze
		console.log('[OpenAI] Uploading file')
		const file = await openai.files.create({
			file: fileStream,
			purpose: 'assistants', // Specify the file will be used with assistants API
		})
		console.log('[OpenAI] File uploaded:', file.id)

		// Analyze document using OpenAI
		// This sends the file to our custom analysis function that extracts relevant information
		console.log('[OpenAI] Analyzing document')
		const analysis = await analyzeDocument(file.id, fileName)
		console.log('[OpenAI] Analysis complete:', {
			type: analysis.record_type,
			name: analysis.record_name
		})

		// Prepare record for database
		// Combine all the information we have into a single record:
		// - User ID for ownership
		// - Analysis results from OpenAI
		// - Processing status
		// - File URL (only for new uploads)
		const dbRecord = {
			user_id: session.user.id,
			...analysis,
			is_processed: true,
			...(pdfFile && { file_url: `${session.user.id}/${Date.now()}_${fileName}` })
		}

		// Update or insert record in database
		// Use a ternary operator to either:
		// - Update existing record if we have a recordId
		// - Insert new record if this is a new upload
		console.log('[DB] Saving record')
		const { error } = recordId
			? await supabase.from('health_records').update(dbRecord).eq('id', recordId)
			: await supabase.from('health_records').insert([dbRecord])

		if (error) {
			console.error('[DB] Error:', error)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		// All steps completed successfully
		console.log('[Process] Document processing completed')
		return NextResponse.json({ success: true, analysis })

	} catch (error) {
		// Log any unexpected errors and return a generic error message
		console.error('[Error] Processing failed:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
