import { google } from 'googleapis';
import { authenticateUser, getGmailAccount } from '@/lib/server/auth';
import { initializeGmailClient, fetchAndProcessEmails, getAttachmentContent } from '@/lib/server/gmail';
import { screenEmailSubjects } from '@/lib/server/openai';
import { GmailMessage, GmailScanResponse, EmailClassification } from '@/types/gmail';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

/**
 * Format the scan results for frontend consumption
 * Combines email data with screening results
 */
function formatResponse(messages: GmailMessage[], screeningResults: any): EmailClassification[] {
	return messages.map(msg => {
		const screening = screeningResults.find((s: any) => s.id === msg.id);
		return {
			id: msg.id,
			subject: msg.subject,
			from: msg.from,
			date: msg.date,
			classification: {
				isMedical: screening?.isMedical || false,
				confidence: screening?.confidence || 0,
			},
			attachments: msg.attachments
		};
	});
}

/**
 * Store medical documents in Supabase and create health records
 */
async function storeMedicalDocuments(emails: EmailClassification[], userId: string, gmail: any) {
	console.log('Starting medical document storage process...');
	const results = {
		stored: 0,
		failed: 0
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

				// Create health record entry
				const { error: dbError } = await supabaseAdmin
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
					});

				if (dbError) {
					console.error('Database error:', dbError);
					throw dbError;
				}

				results.stored++;
				console.log(`Successfully processed attachment ${cleanFilename}`);
			}
		} catch (error) {
			console.error('Failed to process email:', email.id, error);
			results.failed++;
		}
	}

	return results;
}

/**
 * POST handler for Gmail scanning endpoint
 * Processes the following steps:
 * 1. User authentication
 * 2. Gmail account access
 * 3. Email retrieval (with attachments)
 * 4. Medical content classification
 * 5. Store medical documents
 */
export async function POST(request: Request) {
	try {
		console.log('Starting Gmail scan process...');

		// Step 1: Authentication & Authorization
		console.log('Checking authorization...');
		const userId = await authenticateUser(request.headers.get('Authorization'));

		// Step 2: Gmail Account Access
		console.log('Retrieving Gmail account details...');
		const gmailAccount = await getGmailAccount(userId);

		// Step 3: Initialize Gmail Client
		console.log('Initializing Gmail API client...');
		const oauth2Client = initializeGmailClient(gmailAccount.access_token, gmailAccount.refresh_token);
		const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

		// Step 4: Email Retrieval and Processing
		console.log('Fetching emails with attachments...');
		const messages = await fetchAndProcessEmails(gmail);

		if (messages.length === 0) {
			return Response.json({
				message: 'No emails with attachments found',
				total: 0,
				medicalCount: 0,
				stored: 0,
				failed: 0
			});
		}

		// Step 5: Medical Content Classification
		console.log('Classifying emails...');
		const subjects = messages.map(msg => ({ id: msg.id, subject: msg.subject }));
		const screeningResults = await screenEmailSubjects(subjects);
		const classifiedEmails = formatResponse(messages, screeningResults);
		const medicalEmails = classifiedEmails.filter(email => email.classification.isMedical);

		// Step 6: Store Medical Documents
		const storageResults = await storeMedicalDocuments(medicalEmails, userId, gmail);

		// Step 7: Return Final Results
		const response = {
			message: 'Successfully processed emails',
			total: messages.length,
			medicalCount: medicalEmails.length,
			stored: storageResults.stored,
			failed: storageResults.failed
		};

		console.log('Scan complete:', response);
		return Response.json(response);

	} catch (error) {
		console.error('Error scanning Gmail:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return Response.json(
			{ error: `Error scanning Gmail: ${errorMessage}` },
			{ status: 500 }
		);
	}
}
