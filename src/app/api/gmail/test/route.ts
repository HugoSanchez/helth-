import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

async function classifyEmail(subject: string, snippet: string) {
    try {
        console.log('Attempting classification for:', { subject, snippet });
        const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/classify`;
        console.log('Classification URL:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
				'Cookie': cookies().toString(),
            },
            body: JSON.stringify({
                text: `Email snippet: ${snippet}, Subject: ${subject}`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Classification failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error('Classification failed');
        }

        const result = await response.json();
        console.log('Classification result:', result);
        return result.isMedical;
    } catch (error) {
        console.error('Error classifying email:', error);
        return false;
    }
}

export async function GET(request: Request) {
    try {
        // Get pageToken from URL if present
        const { searchParams } = new URL(request.url)
        const pageToken = searchParams.get('pageToken')

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
        const messages = await Promise.all(
            response.data.messages.map(async (message) => {
                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'metadata',
                    metadataHeaders: ['Subject', 'From', 'Date']
                });

                const headers = details.data.payload?.headers;
                const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
                const from = headers?.find(h => h.name === 'From')?.value || '';
                const date = headers?.find(h => h.name === 'Date')?.value || '';
				const snippet = details.data.snippet || '';
				console.log('SNIPPET:', snippet);
                // Classify the email
                const isMedical = await classifyEmail(subject, snippet);

                return {
                    id: message.id,
                    subject,
                    from,
                    date,
                    hasAttachments: details.data.payload?.parts?.some(part => part.filename && part.filename.length > 0) || false,
                    isMedical
                };
            })
        );
		return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
        // Only return medical emails
        const medicalMessages = messages.filter(msg => msg.isMedical);

        return NextResponse.json({
            messages: medicalMessages,
            nextPageToken: response.data.nextPageToken || null
        });
    } catch (error) {
        console.error('Error fetching emails:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}
