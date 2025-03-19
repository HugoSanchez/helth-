import { google } from 'googleapis';
import { authenticateUser, getGmailAccount } from '@/lib/auth';
import { initializeGmailClient, fetchAndProcessEmails } from '@/lib/gmail';
import { screenEmailSubjects } from '@/lib/openai';
import { GmailMessage, GmailScanResponse } from '@/types/gmail';

/**
 * Format the scan results for frontend consumption
 * Combines email data with screening results and sorts by confidence
 *
 * @param messages - Processed Gmail messages
 * @param screeningResults - Results from OpenAI classification
 * @returns Formatted response ready for frontend
 */
function formatResponse(messages: GmailMessage[], screeningResults: any): GmailScanResponse {
	return {
		message: 'Successfully screened email subjects',
		total: messages.length,
		count: screeningResults.filter((result: any) => result.isMedical).length,
		messages: messages.map(msg => {
			const screening = screeningResults.find((s: any) => s.id === msg.id);
			return {
				id: msg.id,
				subject: msg.subject,
				classification: {
					isMedical: screening?.isMedical || false,
					confidence: screening?.confidence || 0,
				}
			};
		}).sort((a, b) => b.classification.confidence - a.classification.confidence),
		done: true
	};
}

/**
 * POST handler for Gmail scanning endpoint
 * Processes the following steps:
 * 1. User authentication
 * 2. Gmail account access
 * 3. Email retrieval and processing
 * 4. Medical content screening
 * 5. Response formatting
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
		console.log('Fetching and processing emails...');
		const messages = await fetchAndProcessEmails(gmail);
		if (messages.length === 0) {
			return Response.json({
				message: 'No messages found',
				total: 0,
				count: 0,
				messages: [],
				done: true
			} as GmailScanResponse);
		}

		// Step 5: Initial Screening with OpenAI
		console.log('Starting subject screening...');
		const subjects = messages.map(msg => ({ id: msg.id, subject: msg.subject }));
		const screeningResults = await screenEmailSubjects(subjects);

		// Step 6: Format and Return Response
		const response = formatResponse(messages, screeningResults);
		console.log('Returning response:', response);
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
