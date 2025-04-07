import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { classifyEmails } from '@/lib/server/anthropic'

// Helper function to send SSE updates
async function sendUpdate(writer: WritableStreamDefaultWriter<any>, update: any) {
    const encoder = new TextEncoder();
    await writer.write(
        encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
    );
}

interface ProcessingStats {
    totalProcessed: number;
    totalMedical: number;
}

async function processEmails(
    writer: WritableStreamDefaultWriter<any>,
    pageToken: string | null,
    stats: ProcessingStats
) {
    try {
        // Get authenticated user
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // Get user's Gmail tokens
        const { data: gmailAccount, error: tokenError } = await supabase
            .from('gmail_accounts')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !gmailAccount) {
            throw new Error('Gmail account not connected');
        }

        // Initialize Gmail client
        const oauth2Client = new google.auth.OAuth2(
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: gmailAccount.access_token,
            refresh_token: gmailAccount.refresh_token
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Send progress update
        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Fetching emails...',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Fetch emails with pageToken if provided
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10,
            pageToken: pageToken || undefined,
            q: 'has:attachment' // Only emails with attachments
        });

        if (!response.data.messages) {
            return {
                nextPageToken: null,
                stats
            };
        }

        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Processing emails...',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Get details for each message
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

        // Update total processed count
        stats.totalProcessed += messageDetails.length;

        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Classifying emails...',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        // Classify all emails in one batch
        const classifications = await classifyEmails(messageDetails);

        // Only return medical emails
        const medicalMessages = messageDetails.filter(msg =>
            classifications.find(c => c.id === msg.id)?.isMedical || false
        );

        // Update total medical count
        stats.totalMedical += medicalMessages.length;

        await sendUpdate(writer, {
            type: 'progress',
            data: {
                status: 'Found medical emails',
                emailsProcessed: stats.totalProcessed,
                medicalEmailsFound: stats.totalMedical
            }
        });

        return {
            nextPageToken: response.data.nextPageToken || null,
            stats
        };
    } catch (error) {
        console.error('Error in processEmails:', error);
        throw error;
    }
}

export async function GET() {
    // Set up streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Initialize processing stats
    const stats: ProcessingStats = {
        totalProcessed: 0,
        totalMedical: 0
    };

    // Process in background
    (async () => {
        try {
            let nextToken: string | null = null;
            let pageCount = 0;
            const MAX_PAGES = 5;

            do {
                // Process current page
                const result = await processEmails(writer, nextToken, stats);
                nextToken = result.nextPageToken;
                pageCount++;

                // Continue until we hit the page limit or run out of emails
            } while (nextToken && pageCount < MAX_PAGES);

            // Send final complete update
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

    // Return the stream
    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
