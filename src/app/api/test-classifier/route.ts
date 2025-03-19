import { google } from 'googleapis';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { classifyEmail } from '@/lib/email-classifier';

export async function POST(request: Request) {
    try {
        // Authentication setup (reusing from scan route)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = authHeader.split(' ')[1];
        const supabase = createServerComponentClient<Database>({ cookies });
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Gmail tokens
        const { data: gmailAccount, error: gmailError } = await supabaseAdmin
            .from('gmail_accounts')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (gmailError || !gmailAccount) {
            return Response.json({ error: 'Gmail account not found' }, { status: 404 });
        }

        // Setup Gmail client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: gmailAccount.access_token,
            refresh_token: gmailAccount.refresh_token,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Fetch last 50 emails
        const messageList = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 50
        });

        if (!messageList.data.messages) {
            return Response.json({ error: 'No messages found' }, { status: 404 });
        }

        // Process emails and classify them
        const results = await Promise.all(
            messageList.data.messages.map(async (message) => {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'full',
                });

                const headers = msg.data.payload?.headers?.reduce((acc: any, header) => {
                    acc[header.name!.toLowerCase()] = header.value;
                    return acc;
                }, {});

                let body = '';
                function processPayloadPart(part: any) {
                    if (part.body?.data) {
                        body += Buffer.from(part.body.data, 'base64').toString();
                    }
                    if (part.parts) {
                        part.parts.forEach(processPayloadPart);
                    }
                }

                if (msg.data.payload) {
                    processPayloadPart(msg.data.payload);
                }

                const emailContent = {
                    subject: headers?.subject || '',
                    from: headers?.from || '',
                    body: body
                };

                // Classify the email
                const classification = await classifyEmail(emailContent);

                // Return both email content and classification for analysis
                return {
                    id: msg.data.id,
                    email: {
                        subject: emailContent.subject,
                        from: emailContent.from,
                        // Only include first 100 chars of body for privacy
                        bodyPreview: body.slice(0, 100) + '...'
                    },
                    classification: {
                        isMedical: classification.isMedical,
                        confidence: classification.confidence,
                        category: classification.category
                    }
                };
            })
        );

        // Analyze results
        const stats = {
            total: results.length,
            medical: results.filter(r => r.classification.isMedical).length,
            byCategory: {} as Record<string, number>,
            averageConfidence: results.reduce((sum, r) => sum + r.classification.confidence, 0) / results.length,
        };

        // Count by category
        results.forEach(r => {
            if (r.classification.category) {
                stats.byCategory[r.classification.category] = (stats.byCategory[r.classification.category] || 0) + 1;
            }
        });

        return Response.json({
            stats,
            results: results.sort((a, b) => b.classification.confidence - a.classification.confidence)
        });

    } catch (error) {
        console.error('Test classification error:', error);
        return Response.json({ error: 'Classification test failed' }, { status: 500 });
    }
}
