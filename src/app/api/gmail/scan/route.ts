import { google } from 'googleapis';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { analyzeEmailContent, analyzeDocument, AnalyzedEmail } from '@/lib/openai';
import { classifyEmail } from '@/lib/email-classifier';

/**
 * Helper function to retrieve and decode the content of an email attachment
 * @param gmail - Gmail API client instance
 * @param userId - Gmail user ID (usually 'me')
 * @param messageId - ID of the email containing the attachment
 * @param attachmentId - ID of the specific attachment to retrieve
 * @returns Decoded string content of the attachment
 */
async function getAttachmentContent(gmail: any, userId: string, messageId: string, attachmentId: string): Promise<string> {
	const attachment = await gmail.users.messages.attachments.get({
		userId,
		messageId,
		id: attachmentId,
	});

	// Gmail API returns attachment data in base64 format
	const content = Buffer.from(attachment.data.data, 'base64').toString();
	return content;
}

export async function POST(request: Request) {
	try {
		// Step 1: Authentication & Authorization
		// ====================================
		// Extract bearer token from Authorization header
		const authHeader = request.headers.get('Authorization');

		if (!authHeader?.startsWith('Bearer ')) {
			console.log('No valid authorization header');
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const accessToken = authHeader.split(' ')[1];
		const supabase = createServerComponentClient<Database>({ cookies });

		// Verify user's identity using Supabase
		const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

		if (userError || !user) {
			console.log('User authentication failed:', userError);
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Step 2: Gmail Account Access
		// ===========================
		// Retrieve user's Gmail tokens from our database
		const { data: gmailAccount, error: gmailError } = await supabaseAdmin
			.from('gmail_accounts')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (gmailError || !gmailAccount) {
			return Response.json({ error: 'Gmail account not found' }, { status: 404 });
		}

		// Initialize Gmail API client with user's tokens
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

		// Step 3: Email Retrieval
		// ======================
		// Get exactly 50 most recent emails to avoid quota issues
		const messageList = await gmail.users.messages.list({
			userId: 'me',
			maxResults: 50
		});

		if (!messageList.data.messages) {
			return Response.json({
				message: 'No messages found',
				count: 0,
				messages: [],
				done: true
			});
		}

		// Step 4: Email Processing
		// ======================
		// Process each email to extract relevant information
		const messages = await Promise.all(
			messageList.data.messages.map(async (message) => {
				// Get full message content including headers and body
				const msg = await gmail.users.messages.get({
					userId: 'me',
					id: message.id!,
					format: 'full',
				});

				// Extract email headers
				const headers = msg.data.payload?.headers?.reduce((acc: any, header) => {
					acc[header.name!.toLowerCase()] = header.value;
					return acc;
				}, {});

				let body = '';
				const attachments: Array<{ id: string; filename: string; mimeType: string }> = [];

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

				if (msg.data.payload) {
					processPayloadPart(msg.data.payload);
				}

				return {
					id: msg.data.id!,
					subject: headers?.subject || '',
					from: headers?.from || '',
					date: headers?.date || '',
					body: body,
					attachments,
				};
			})
		);

		// Step 5: Initial Screening with Transformer
		// =======================================
		const initialScreening = await Promise.all(
			messages.map(msg => classifyEmail(msg))
		);

		// Filter messages that are likely medical
		const potentialMedicalMessages = messages.filter((msg, index) =>
			initialScreening[index].isMedical
		);

		// Step 6: Detailed Analysis of Potential Medical Emails
		// =================================================
		const analyzedMessages: AnalyzedEmail[] = await Promise.all(
			potentialMedicalMessages.map(msg => analyzeEmailContent(msg))
		);

		// Filter confirmed medical emails
		const medicalEmails = analyzedMessages.filter(email => email.isMedical);

		// Process attachments for confirmed medical emails
		for (const email of medicalEmails) {
			if (email.attachments.length > 0) {
				const documentAnalyses = await Promise.all(
					email.attachments.map(async (attachment) => {
						if (!attachment.mimeType.match(/^(application\/pdf|text\/.*)/)) {
							return null;
						}

						try {
							const content = await getAttachmentContent(gmail, 'me', email.id, attachment.id);
							return await analyzeDocument(content, attachment.filename);
						} catch (error) {
							console.error(`Error analyzing attachment ${attachment.filename}:`, error);
							return null;
						}
					})
				);

				email.documentAnalysis = documentAnalyses.filter((analysis): analysis is NonNullable<typeof analysis> => analysis !== null);
			}
		}

		// Sort by confidence
		medicalEmails.sort((a, b) => b.confidence - a.confidence);

		return Response.json({
			message: 'Successfully analyzed messages and documents',
			count: medicalEmails.length,
			messages: medicalEmails,
			done: true
		});

	} catch (error) {
		console.error('Error scanning Gmail:', error);
		return Response.json(
			{ error: 'Failed to scan Gmail messages' },
			{ status: 500 }
		);
	}
}
