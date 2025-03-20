import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/openai'
import { authenticateUser } from '@/lib/auth'
import OpenAI from 'openai'
import formidable from 'formidable'
import { Readable } from 'stream'
import { IncomingMessage } from 'http'
import { Fields, Files } from 'formidable'
import fs from 'fs'

// Route Segment Config
export const runtime = 'nodejs' // Specify Node.js runtime
export const dynamic = 'force-dynamic' // Disable static optimization

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

		// Initialize Supabase client for database operations
		const supabase = createRouteHandlerClient({ cookies })

		// Parse multipart form data using formidable
		console.log('[Form] Parsing form data')
		const form = formidable({})

		// Debug the request body
		const buffer = await req.arrayBuffer()
		console.log('[Debug] Request body size:', buffer.byteLength)

		const readable = new Readable()
		readable.push(Buffer.from(buffer))
		readable.push(null)  // Signal the end of the stream

		console.log('[Debug] Created readable stream')

		const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
			form.parse(readable as unknown as IncomingMessage, (err, fields, files) => {
				if (err) {
					console.error('[Debug] Form parse error:', err)
					reject(err)
				} else {
					console.log('[Debug] Form parsed successfully')
					resolve([fields, files])
				}
			})
		})

		/**
		// Extract recordId and file from form data
		const recordId = fields.recordId?.[0]
		const pdfFile = files.file?.[0]
		console.log('[Process] Request details:', { recordId, hasFile: !!pdfFile })

		let fileStream
		let fileName

		// Handle existing record
		if (recordId) {
			console.log('[DB] Fetching existing record:', recordId)
			const { data: record } = await supabase
				.from('health_records')
				.select('file_url, record_name')
				.eq('id', recordId)
				.single()

			if (!record) {
				console.log('[DB] Record not found:', recordId)
				return NextResponse.json({ error: 'Record not found' }, { status: 404 })
			}

			console.log('[Storage] Downloading file:', record.file_url)
			const { data } = await supabase.storage.from('documents').download(record.file_url)
			if (!data) {
				console.log('[Storage] File not found:', record.file_url)
				return NextResponse.json({ error: 'File not found' }, { status: 404 })
			}

			const arrayBuffer = await data.arrayBuffer()
			const tempPath = `/tmp/${record.file_url}`
			await fs.promises.writeFile(tempPath, Buffer.from(arrayBuffer))
			fileStream = fs.createReadStream(tempPath)
			fileName = record.record_name

		// Handle new file upload
		} else if (pdfFile) {
			console.log('[Process] Processing new upload:', pdfFile.originalFilename)
			fileStream = fs.createReadStream(pdfFile.filepath)
			fileName = pdfFile.originalFilename || 'unknown'
		} else {
			console.log('[Error] No file or record ID provided')
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		// Upload and analyze with OpenAI
		console.log('[OpenAI] Uploading file')
		const file = await openai.files.create({
			file: fileStream,
			purpose: 'assistants',
		})
		console.log('[OpenAI] File uploaded:', file.id)

		console.log('[OpenAI] Analyzing document')
		const analysis = await analyzeDocument(file.id, fileName)
		console.log('[OpenAI] Analysis complete:', {
			type: analysis.record_type,
			name: analysis.record_name
		})

		// Prepare and save record
		const dbRecord = {
			user_id: userId,
			...analysis,
			is_processed: true,
			...(pdfFile && { file_url: `${userId}/${Date.now()}_${fileName}` })
		}

		console.log('[DB] Saving record')
		const { error } = recordId
			? await supabase.from('health_records').update(dbRecord).eq('id', recordId)
			: await supabase.from('health_records').insert([dbRecord])

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
