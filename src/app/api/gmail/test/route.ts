import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { classifyEmails } from '@/lib/server/anthropic'
import { gmail_v1 } from 'googleapis/build/src/apis/gmail/v1'

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
}

/**
 * Initialize Gmail client with user's credentials
 * This is done once at the start of the process to avoid repeated authentication
 *
 * @returns Initialized Gmail client instance
 * @throws Error if authentication fails or Gmail account is not connected
 */
async function initializeGmailClient(): Promise<gmail_v1.Gmail> {
    // Step 1: Get authenticated user from Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('Unauthorized');
    }

    // Step 2: Get user's Gmail credentials
    const { data: gmailAccount, error: tokenError } = await supabase
        .from('gmail_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (tokenError || !gmailAccount) {
        throw new Error('Gmail account not connected');
    }

    // Step 3: Initialize and return Gmail client
    const oauth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: gmailAccount.access_token,
        refresh_token: gmailAccount.refresh_token
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Core function that processes a single page of emails from Gmail
 * This function:
 * 1. Fetches a batch of emails using the provided Gmail client
 * 2. Processes each email's details
 * 3. Classifies emails as medical or non-medical
 * 4. Sends progress updates to the client
 *
 * @param gmail - Initialized Gmail client (reused across batches)
 * @param writer - Stream writer for sending real-time updates
 * @param pageToken - Gmail's pagination token (null for first page)
 * @param stats - Object tracking overall processing statistics
 * @returns Object containing next page token and updated stats
 */
async function processEmails(
    gmail: gmail_v1.Gmail,
    writer: WritableStreamDefaultWriter<any>,
    pageToken: string | null,
    stats: ProcessingStats
) {
    try {
        // Step 1: Send initial progress update
        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Fetching emails...',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Step 2: Fetch batch of emails
        // Get a page of emails (max 10) that have attachments
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10,
            pageToken: pageToken || undefined,
            q: 'has:attachment' // Only emails with attachments
        });

        // If no messages found, return early with current stats
        if (!response.data.messages) {
            return {
                nextPageToken: null,
                stats
            };
        }

        // Step 3: Send processing status update
        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Processing emails...',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Step 4: Get detailed information for each email
        const messageDetails = await Promise.all(
            response.data.messages.map(async (message) => {
                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'metadata',
                    metadataHeaders: ['Subject']
                });

                const subject = details.data.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
                const snippet = details.data.snippet || '';

                return {
                    id: message.id!,
                    subject,
                    snippet
                };
            })
        );

        // Step 5: Update processing statistics
        stats.totalProcessed += messageDetails.length;

        // Step 6: Send progress update for email processing
        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Classifying emails...',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Step 7: Classify emails using Claude
        const classifications = await classifyEmails(messageDetails);

        // Step 8: Filter medical emails
        const medicalMessages = messageDetails.filter(msg =>
            classifications.find(c => c.id === msg.id)?.isMedical || false
        );

        // Step 9: Update medical email count
        stats.totalMedical += medicalMessages.length;

        // Step 10: Send progress update with new medical email count
        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Found medical emails',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Step 11: Return results
        return {
            nextPageToken: response.data.nextPageToken || null,
            stats
        };
    } catch (error) {
        console.error('Error in processEmails:', error);
        throw error;
    }
}

/**
 * GET route handler for the email processing endpoint
 * Implements Server-Sent Events (SSE) for real-time progress updates
 *
 * The process flow:
 * 1. Sets up a streaming response
 * 2. Initializes Gmail client (done once)
 * 3. Processes emails page by page (up to 5 pages)
 * 4. Sends progress updates for each step
 * 5. Handles errors and completion
 *
 * @returns Response with SSE stream
 */
export async function GET() {
    // Step 1: Set up streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Step 2: Initialize tracking statistics
    const stats: ProcessingStats = {
        totalProcessed: 0,
        totalMedical: 0
    };

    // Step 3: Start background processing
    (async () => {
        try {
            // Initialize Gmail client once for all requests
            const gmail = await initializeGmailClient();

            let nextToken: string | null = null;
            let pageCount = 0;
            const MAX_PAGES = 5;  // Limit to prevent excessive API usage

            // Step 4: Process pages in a loop
            do {
                // Process current page of emails using the same Gmail client
                const result = await processEmails(gmail, writer, nextToken, stats);
                nextToken = result.nextPageToken;
                pageCount++;

                // Continue until we hit the page limit or run out of emails
            } while (nextToken && pageCount < MAX_PAGES);

            // Step 5: Send completion update
            await sendUpdate(writer, {
                type: 'complete',
                data: {
                    status: 'completed',
                    emailsProcessed: stats.totalProcessed,
                    medicalEmailsFound: stats.totalMedical
                }
            });

            await writer.close();
        } catch (error) {
            // Step 6: Handle any errors during processing
            console.error('Error processing emails:', error);
            await sendUpdate(writer, {
                type: 'error',
                data: {
                    error: error instanceof Error ? error.message : 'Failed to process emails'
                }
            });
            await writer.close();
        }
    })();

    // Step 7: Return the stream response
    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
