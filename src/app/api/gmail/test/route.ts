import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { classifyEmails, analyzeDocument } from '@/lib/server/anthropic'
import { gmail_v1 } from 'googleapis/build/src/apis/gmail/v1'
import { storeDocument } from '@/lib/server/db'
import { GaxiosPromise } from 'gaxios'

/**
 * Helper function to send Server-Sent Events (SSE) updates to the client
 * SSE allows real-time updates to be pushed to the client without closing the connection
 *
 * @param writer - The stream writer used to send updates
 * @param update - The data to send (will be converted to a JSON string)
 */
async function sendUpdate(writer: WritableStreamDefaultWriter<any>, update: any) {
    const encoder = new TextEncoder();
    await writer.write(
        encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
    );
}

/**
 * Interface defining the structure for tracking email processing statistics
 * Used to maintain counts across multiple pages of email processing
 */
interface ProcessingStats {
    totalProcessed: number;  // Running total of all emails processed
    totalMedical: number;    // Running total of medical emails found
    totalDocuments: number;  // Running total of documents stored
}

/**
 * Initialize Gmail client with OAuth2 credentials
 * Handles authentication and client setup
 */
async function initializeGmailClient(): Promise<gmail_v1.Gmail> {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: gmailAccount, error: tokenError } = await supabase
        .from('gmail_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (tokenError || !gmailAccount) {
        throw new Error('Gmail account not connected')
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
        access_token: gmailAccount.access_token,
        refresh_token: gmailAccount.refresh_token
    })

    return google.gmail({ version: 'v1', auth: oauth2Client })
}

/**
 * Process a batch of emails from Gmail
 * Includes classification, attachment handling, and document storage
 */
async function processEmails(
    gmail: gmail_v1.Gmail,
    writer: WritableStreamDefaultWriter<any>,
    pageToken: string | undefined,
    stats: ProcessingStats,
    userId: string
) {
    const MAX_RESULTS = 10
    const MAX_PAGES = 5

    let currentPage = 1
    let nextToken = pageToken

    while (currentPage <= MAX_PAGES) {
        // Fetch emails for the current page
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: MAX_RESULTS,
            pageToken: nextToken,
            q: 'has:attachment' // Only fetch emails with attachments
        })

        // Messages contain the email ids that match the query (have attachments)
        const messages = response.data.messages || []
        if (messages.length === 0) {
            console.log('[Process] No more messages to process')
            break
        }

        // We iterate over those IDs to
        // get email details and prepare for classification
        const emailDetails = await Promise.all(messages.map(async (message: gmail_v1.Schema$Message) => {
            const details = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!
            })

            const subject = details.data.payload?.headers?.find(h => h.name === 'Subject')?.value || ''
            const snippet = details.data.snippet || ''

            return {
                id: message.id!,
                subject,
                snippet,
                details: details.data
            }
        }))

        // Classify emails usign Claude API
        // Returns an array of objects with the email id, if it's medical and the confidence score
        const classifications = await classifyEmails(emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            snippet: email.snippet
        })))

        // Process medical emails and their attachments
        for (const classification of classifications) {
            stats.totalProcessed++

            if (classification.isMedical) {
                stats.totalMedical++
                console.log('medical email', classification)
                const email = emailDetails.find(e => e.id === classification.id)
                if (!email?.details.payload?.parts) continue

                // Process attachments
                // We filter the attachments to only get the ones that have a filename and an attachmentId
                const attachments = email.details.payload.parts.filter((part: gmail_v1.Schema$MessagePart) =>
                    part.filename && part.body?.attachmentId
                )

                for (const attachment of attachments) {
                    try {
                        // Skip non-PDF attachments
                        if (attachment.mimeType !== 'application/pdf') {
                            console.log(`Skipping non-PDF attachment: ${attachment.filename} (${attachment.mimeType})`)
                            continue
                        }

                        // Get attachment content
                        const attachmentData = await gmail.users.messages.attachments.get({
                            userId: 'me',
                            messageId: email.id,
                            id: attachment.body!.attachmentId!
                        })

                        if (!attachmentData.data.data) continue

                        console.log('Attachment info:', {
                            filename: attachment.filename,
                            mimeType: attachment.mimeType,
                            size: attachmentData.data.size,
                            // Log first 100 chars of data to see format
                            sampleData: attachmentData.data.data.slice(0, 100)
                        })

                        // Convert from base64url to base64
                        const base64Data = attachmentData.data.data.replace(/-/g, '+').replace(/_/g, '/')

                        // Convert base64 to buffer for storage
                        const buffer = Buffer.from(base64Data, 'base64')

                        // Analyze document with properly formatted base64 data
                        const analysis = await analyzeDocument(base64Data)

                        // Only store if analysis was successful
                        if (analysis.status === 'success') {
                            // Use storeDocument which handles both storage and database record
                            const storedDoc = await storeDocument(userId, attachment.filename!, buffer, analysis)
                            if (storedDoc) {
                                stats.totalDocuments++
                                console.log(`Successfully stored document: ${attachment.filename}`)
                            }
                        } else if (analysis.error_type === 'encrypted_pdf') {
                            console.log(`Skipping password-protected PDF: ${attachment.filename}`)
                            continue
                        }
                    } catch (error: unknown) {
                        console.error(`Error processing attachment ${attachment.filename}:`, error)
                        continue
                    }
                }
            }
        }

        // Send progress update
        await sendUpdate(writer, {
            type: 'progress',
            processed: stats.totalProcessed,
            medical: stats.totalMedical,
            documents: stats.totalDocuments
        })

        // Check if we should continue to next page
        nextToken = response.data.nextPageToken || undefined
        if (!nextToken) {
            console.log('[Process] No more pages to process')
            break
        }

        currentPage++
    }

    // Log final stats
    console.log('[Process] Email processing complete. Final stats:', {
        processed: stats.totalProcessed,
        medical: stats.totalMedical,
        documents: stats.totalDocuments
    })

    // Send completion update and close the stream
    await sendUpdate(writer, {
        type: 'complete',
        processed: stats.totalProcessed,
        medical: stats.totalMedical,
        documents: stats.totalDocuments
    })

    // Close the stream here, as it was working before
    await writer.close()
}

/**
 * GET handler for the email processing endpoint
 * Implements Server-Sent Events for real-time progress updates
 */
export async function GET() {
    // Create the transform stream
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Create the response first
    const response = new NextResponse(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })

    // Initialize processing in the background
    const processPromise = (async () => {
        try {
            const supabase = createRouteHandlerClient({ cookies })
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            const gmail = await initializeGmailClient()
            const stats: ProcessingStats = {
                totalProcessed: 0,
                totalMedical: 0,
                totalDocuments: 0
            }

            await processEmails(gmail, writer, undefined, stats, user.id)
        } catch (error) {
            console.error('Processing error:', error)
            try {
                await sendUpdate(writer, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'An error occurred'
                })
            } catch (e) {
                console.error('Error sending error update:', e)
            }
        } finally {
            try {
                await writer.close()
            } catch (e) {
                console.error('Error closing writer:', e)
            }
        }
    })()

    // Don't await the promise - let it run in the background
    processPromise.catch(console.error)

    return response
}
