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
 *
 * @param gmail - Initialized Gmail API client
 * @param maxResults - Maximum number of messages to fetch (default: 50)
 * @returns Array of processed Gmail messages
 *
 * @example
 * const messages = await fetchAndProcessEmails(gmailClient);
 */
export async function fetchAndProcessEmails(gmail: any, maxResults: number = 50): Promise<GmailMessage[]> {
    const messageList = await gmail.users.messages.list({
        userId: 'me',
        maxResults
    });

    if (!messageList.data.messages) {
        return [];
    }

    return Promise.all(
        messageList.data.messages.map(async (message: any) => {
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

            return {
                id: msg.data.id!,
                subject: headers?.subject || '',
                from: headers?.from || '',
                date: headers?.date || '',
                body,
                attachments,
            };
        })
    );
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
