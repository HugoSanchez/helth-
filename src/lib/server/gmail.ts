import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function initializeGmailClient(userId: string) {
  const { data: account } = await supabaseAdmin
    .from('gmail_accounts')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single();

  if (!account) {
    throw new Error('No Gmail account found for user');
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function fetchAndProcessEmails(gmail: any, query: string) {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    });

    const messages = response.data.messages || [];
    const emailDetails = await Promise.all(
      messages.map(async (message: any) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const headers = details.data.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';

        return {
          id: message.id,
          subject,
          from,
          date,
          hasAttachments: details.data.payload.parts?.some((part: any) => part.filename),
        };
      })
    );

    return emailDetails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

export async function getAttachmentContent(gmail: any, messageId: string, attachmentId: string) {
  try {
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    return response.data.data;
  } catch (error) {
    console.error('Error getting attachment:', error);
    throw error;
  }
}
