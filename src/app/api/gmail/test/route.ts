import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { classifyEmails } from '@/lib/server/anthropic'

export async function GET(request: Request) {
    try {
        // Get pageToken and page count from URL
        const { searchParams } = new URL(request.url)
        const pageToken = searchParams.get('pageToken')
        const currentPage = parseInt(searchParams.get('page') || '1')

        // Stop after 5 pages
        if (currentPage > 5) {
            return NextResponse.json({
                messages: [],
                nextPageToken: null,
                message: 'Maximum page limit reached'
            });
        }

        // Get authenticated user
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's Gmail tokens
        const { data: gmailAccount, error: tokenError } = await supabase
            .from('gmail_accounts')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !gmailAccount) {
            return NextResponse.json({ error: 'Gmail account not connected' }, { status: 400 });
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

        // Fetch emails with pageToken if provided
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10,
            pageToken: pageToken || undefined,
            q: 'has:attachment' // Only emails with attachments
        });

        if (!response.data.messages) {
            return NextResponse.json({
                messages: [],
                nextPageToken: null
            });
        }

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
        console.log('MESSAGE DETAILS:', messageDetails);
        console.log(`Number of messages to classify: ${messageDetails.length}`);

        // Classify all emails in one batch
        const classifications = await classifyEmails(messageDetails);
        console.log('CLASSIFICATIONS:', classifications);
        console.log(`Number of classifications received: ${classifications.length}`);

        // Only return medical emails - using ID matching instead of array indices
        const medicalMessages = messageDetails.filter(msg =>
            classifications.find(c => c.id === msg.id)?.isMedical || false
        );
        console.log(`Number of medical messages found: ${medicalMessages.length}`);

        return NextResponse.json({
            messages: medicalMessages,
            nextPageToken: response.data.nextPageToken || null,
            currentPage,
            hasMore: currentPage < 5 && !!response.data.nextPageToken
        });

    } catch (error) {
        console.error('Error fetching emails:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}
