import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable')
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

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

export async function POST(req: Request) {
    console.log('[Claude Process] Starting document processing')
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

        if (!file.type.includes('pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
        }

        // Convert file to buffer and base64
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Pdf = buffer.toString('base64')

        console.log('[Claude] Sending document for analysis...')

        // Call Claude API with base64-encoded PDF
        const response = await anthropic.beta.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            tools: [{
                name: "processHealthRecord",
                description: "Process and structure medical document information",
                input_schema: {
                    type: "object",
                    properties: {
                        record_type: {
                            type: "string",
                            enum: ["lab_report", "prescription", "imaging", "clinical_notes", "other"],
                            description: "The type of medical record"
                        },
                        record_name: {
                            type: "string",
                            description: "A descriptive name for the record"
                        },
                        summary: {
                            type: "string",
                            description: "A brief summary of the document's key information"
                        },
                        doctor_name: {
                            type: "string",
                            description: "The name of the healthcare provider, if present"
                        },
                        date: {
                            type: "string",
                            description: "The document date in ISO format (YYYY-MM-DD), if present"
                        }
                    },
                    required: ["record_type", "record_name", "summary"]
                }
            }],
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: base64Pdf,
                            },
                        },
                        {
                            type: 'text',
                            text: "Please analyze this medical document and extract the key information using the processHealthRecord function. Please only return the JSON object, nothing else."
                        },
                    ],
                },
            ],
            betas: ["token-efficient-tools-2025-02-19"]
        })

        console.log('[Claude] Analysis complete')
		/**
        // Store the file in Supabase for future reference
        const timestamp = Date.now()
        const storagePath = `${userId}/${timestamp}_${file.name}`

        const { error: uploadError } = await supabaseAdmin
            .storage
            .from('health_documents')
            .upload(storagePath, buffer, {
                upsert: false,
                contentType: 'application/pdf'
            })

        if (uploadError) {
            console.error('[Storage] Upload failed:', uploadError)
            // Continue anyway since we have the analysis
        } else {
            console.log('[Storage] File uploaded:', storagePath)
        }
		 */
        // Parse Claude's response
        let analysis = null
        for (const content of response.content) {
            // @ts-ignore - Beta feature not yet in types
            if (content.type === 'tool_use') {
				// @ts-ignore - Beta feature not yet in types
				analysis = content.input
            }
        }
		console.log('[Claude] Analysis:', analysis)

        if (!analysis) {
            throw new Error('No valid analysis from Claude')
        }

        return NextResponse.json({
            success: true,
            analysis,
            message: "Document analyzed successfully"
        })

    } catch (error) {
        console.error('[Error]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
        )
    }
}
