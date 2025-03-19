import { google } from 'googleapis';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { analyzeEmailContent, analyzeDocument, AnalyzedEmail, screenEmailSubjects } from '@/lib/openai';

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
		console.log('Starting Gmail scan process...');

		// Step 1: Authentication & Authorization
		// ====================================
		console.log('Checking authorization...');
		const authHeader = request.headers.get('Authorization');

		if (!authHeader?.startsWith('Bearer ')) {
			console.log('No valid authorization header');
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const accessToken = authHeader.split(' ')[1];
		const supabase = createServerComponentClient<Database>({ cookies });

		// Verify user's identity using Supabase
		console.log('Verifying user identity...');
		const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

		if (userError || !user) {
			console.log('User authentication failed:', userError);
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}
		console.log('User authenticated successfully');

		// Step 2: Gmail Account Access
		// ===========================
		console.log('Retrieving Gmail account details...');
		const { data: gmailAccount, error: gmailError } = await supabaseAdmin
			.from('gmail_accounts')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (gmailError || !gmailAccount) {
			console.log('Gmail account not found:', gmailError);
			return Response.json({ error: 'Gmail account not found' }, { status: 404 });
		}
		console.log('Gmail account found');

		// Initialize Gmail API client
		console.log('Initializing Gmail API client...');
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
		console.log('Gmail API client initialized');

		// Step 3: Email Retrieval
		// ======================
		console.log('Fetching email list...');
		const messageList = await gmail.users.messages.list({
			userId: 'me',
			maxResults: 50
		});

		if (!messageList.data.messages) {
			console.log('No messages found');
			return Response.json({
				message: 'No messages found',
				count: 0,
				messages: [],
				done: true
			});
		}
		console.log(`Found ${messageList.data.messages.length} messages`);

		// Step 4: Email Processing
		// ======================
		console.log('Processing emails...');
		const messages = await Promise.all(
			messageList.data.messages.map(async (message) => {
				console.log(`Processing message ${message.id}`);
				// Get full message content
				const msg = await gmail.users.messages.get({
					userId: 'me',
					id: message.id!,
					format: 'full',
				});

				// Extract headers and process message
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
		console.log('Email processing completed');

		// Step 5: Initial Screening with OpenAI
		// ====================================
		console.log('Starting subject screening...');
		const subjects = messages.map(msg => ({ id: msg.id, subject: msg.subject }));
		console.log('Subjects prepared for screening:', subjects);

		const initialScreening = await screenEmailSubjects(subjects);
		console.log('Subject screening completed');

		// Return results
		const response = {
			message: 'Successfully screened email subjects',
			total: subjects.length,
			count: initialScreening.filter(result => result.isMedical).length,
		};
		console.log('Returning response:', response);

		return Response.json(response);

	} catch (error) {
		console.error('Error scanning Gmail:', error);
		return Response.json(
			{ error: `Error scanning Gmail: ${error}` },
			{ status: 500 }
		);
	}
}
