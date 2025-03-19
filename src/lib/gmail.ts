import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GmailMessage, GmailAttachment } from '@/types/gmail';

/**
 * Initialize Gmail API client with OAuth2 credentials
 *
 * @param accessToken - Current access token for Gmail API
 * @param refreshToken - Refresh token for obtaining new access tokens
 * @returns Configured OAuth2 client ready for Gmail API calls
 *
 * @example
 * const oauth2Client = initializeGmailClient(accessToken, refreshToken);
 * const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
 */
export function initializeGmailClient(accessToken: string, refreshToken: string): OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    return oauth2Client;
}

/**
 * Process Gmail message payload to extract body content and attachments
 * Handles both single and multipart messages, decoding base64 content
 *
 * @param payload - Raw Gmail message payload
 * @returns Object containing decoded body text and array of attachments
 *
 * @example
 * const { body, attachments } = processEmailPayload(message.payload);
 */
export function processEmailPayload(payload: any): { body: string; attachments: GmailAttachment[] } {
    let body = '';
    const attachments: GmailAttachment[] = [];

    function processPayloadPart(part: any) {
        if (part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString();
        }
        if (part.body?.attachmentId) {
            attachments.push({
                id: part.body.attachmentId,
                filename: part.filename || 'unknown',
                mimeType: part.mimeType || 'application/octet-stream',
            });
        }
        if (part.parts) {
            part.parts.forEach(processPayloadPart);
        }
    }

    if (payload) {
        processPayloadPart(payload);
    }

    return { body, attachments };
}

/**
 * Fetch and process multiple email messages from Gmail
 * Retrieves full message content and processes headers, body, and attachments
 * Only returns messages that have attachments, limited to first 20
 *
 * @param gmail - Initialized Gmail API client
 * @returns Array of processed Gmail messages (max 20 with attachments)
 */
export async function fetchAndProcessEmails(gmail: any): Promise<GmailMessage[]> {
    const processedMessages: GmailMessage[] = [];
    let pageToken: string | undefined = undefined;

    // Continue fetching pages until we find 20 emails with attachments or run out of emails
    while (processedMessages.length < 20) {
        console.log(`Fetching next page of messages. Currently have ${processedMessages.length} with attachments...`);

        // Get next batch of message IDs
        const messageList: { data: { messages?: { id: string }[], nextPageToken?: string } } = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 50,
            pageToken
        });

        // If no more messages, break
        if (!messageList.data.messages) {
            console.log('No more messages to process');
            break;
        }

        // Save next page token for subsequent requests
        pageToken = messageList.data.nextPageToken;

        // Process this batch of messages
        for (const message of messageList.data.messages) {
            if (processedMessages.length >= 20) break;

            try {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'full',
                });

                const headers = msg.data.payload?.headers?.reduce((acc: any, header: any) => {
                    acc[header.name!.toLowerCase()] = header.value;
                    return acc;
                }, {});

                const { body, attachments } = processEmailPayload(msg.data.payload);

                // Only include messages with attachments
                if (attachments.length > 0) {
                    processedMessages.push({
                        id: msg.data.id!,
                        subject: headers?.subject || '',
                        from: headers?.from || '',
                        date: headers?.date || '',
                        body,
                        attachments,
                    });
                    console.log(`Found email with ${attachments.length} attachment(s). Total found: ${processedMessages.length}`);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                continue;
            }
        }

        // If no next page, we've processed all available emails
        if (!pageToken) {
            console.log('No more pages to fetch');
            break;
        }
    }

    console.log(`Completed search. Found ${processedMessages.length} messages with attachments`);
    return processedMessages;
}

/**
 * Retrieve and decode the content of a specific email attachment
 *
 * @param gmail - Initialized Gmail API client
 * @param userId - Gmail user ID (usually 'me')
 * @param messageId - ID of the email containing the attachment
 * @param attachmentId - ID of the specific attachment to retrieve
 * @returns Decoded string content of the attachment
 *
 * @example
 * const content = await getAttachmentContent(gmail, 'me', messageId, attachmentId);
 */
export async function getAttachmentContent(
	gmail: any,
	userId: string,
	messageId: string,
	attachmentId: string
): Promise<string> {
	const attachment = await gmail.users.messages.attachments.get({
		userId,
		messageId,
		id: attachmentId,
	});

	return Buffer.from(attachment.data.data, 'base64').toString();
}
