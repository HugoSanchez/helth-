import { google } from 'googleapis';
import { authenticateUser, getGmailAccount } from '@/lib/server/auth';
import { initializeGmailClient, getAttachmentContent } from '@/lib/server/gmail';
import { supabaseAdmin } from '@/lib/server/supabase';
import { EmailClassification } from '@/types/gmail';

interface StoreRequest {
    emails: EmailClassification[];
}

interface StoreResponse {
    stored: number;
    failed: number;
    records: Array<{
        id: string;
        email_id: string;
        record_name: string;
    }>;
}

/**
 * POST handler for storing medical documents
 * 1. Downloads attachments from medical emails
 * 2. Stores them in Supabase storage
 * 3. Creates health_records entries
 */
export async function POST(request: Request) {
    try {
        console.log('Starting medical document storage process...');

        // Step 1: Parse request and authenticate
        const { emails } = await request.json() as StoreRequest;
        const userId = await authenticateUser(request.headers.get('Authorization'));
        console.log(`Processing ${emails.length} emails for user ${userId}`);

        // Step 2: Get Gmail access
        const gmailAccount = await getGmailAccount(userId);
        const oauth2Client = initializeGmailClient(gmailAccount.access_token, gmailAccount.refresh_token);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Step 3: Process each medical email
        const results = {
            stored: 0,
            failed: 0,
            records: [] as StoreResponse['records']
        };

        for (const email of emails) {
            if (!email.classification.isMedical) {
                console.log(`Skipping non-medical email ${email.id}`);
                continue;
            }

            console.log(`Processing medical email ${email.id} with ${email.attachments.length} attachments`);

            try {
                // Process each attachment
                for (const attachment of email.attachments) {
                    console.log(`Downloading attachment ${attachment.filename} from email ${email.id}`);

                    // Get attachment content
                    const content = await getAttachmentContent(gmail, 'me', email.id, attachment.id);

                    // Create a clean filename (remove special characters)
                    const cleanFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_');

                    // Upload to Supabase storage
                    // Structure: health_documents/user_id/email_id/filename
                    const filePath = `${userId}/${email.id}/${cleanFilename}`;
                    console.log(`Uploading to storage: ${filePath}`);

                    const { data: file, error: uploadError } = await supabaseAdmin
                        .storage
                        .from('health_documents')
                        .upload(filePath, Buffer.from(content), {
                            contentType: attachment.mimeType,
                            upsert: true
                        });

                    if (uploadError) {
                        console.error('Storage upload error:', uploadError);
                        throw uploadError;
                    }

                    // Get the public URL for the file
                    const { data: { publicUrl } } = supabaseAdmin
                        .storage
                        .from('health_documents')
                        .getPublicUrl(filePath);

                    console.log(`Creating health record entry for ${cleanFilename}`);

                    // Create health record entry
                    const { data: record, error: dbError } = await supabaseAdmin
                        .from('health_records')
                        .insert({
                            user_id: userId,
                            email_id: email.id,
                            record_name: cleanFilename,
                            record_type: attachment.mimeType,
                            file_url: filePath,
                            is_processed: false,
                            date: new Date(email.date).toISOString(),
                            summary: null,
                            doctor_name: null
                        })
                        .select('id, email_id, record_name')
                        .single();

                    if (dbError) {
                        console.error('Database error:', dbError);
                        throw dbError;
                    }

                    results.stored++;
                    if (record) {
                        results.records.push(record);
                    }
                    console.log(`Successfully processed attachment ${cleanFilename}`);
                }
            } catch (error) {
                console.error('Failed to process email:', email.id, error);
                results.failed++;
            }
        }

        console.log(`Storage process complete. Stored: ${results.stored}, Failed: ${results.failed}`);
        return Response.json(results);

    } catch (error) {
        console.error('Error storing medical documents:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return Response.json(
            { error: `Error storing medical documents: ${errorMessage}` },
            { status: 500 }
        );
    }
}
