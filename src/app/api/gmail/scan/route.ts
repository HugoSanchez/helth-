import { google } from 'googleapis';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
	try {
		const authHeader = request.headers.get('Authorization');

		if (!authHeader?.startsWith('Bearer ')) {
			console.log('No valid authorization header');
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const accessToken = authHeader.split(' ')[1];
		const supabase = createServerComponentClient<Database>({ cookies });

		// Get user directly using the access token
		const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

		if (userError || !user) {
			console.log('3. User error or no user:', userError);
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's Gmail tokens
		const { data: gmailAccount, error: gmailError } = await supabaseAdmin
			.from('gmail_accounts')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (gmailError || !gmailAccount) {
			return Response.json({ error: 'Gmail account not found' }, { status: 404 });
		}

		// Set up Gmail API client
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

		// List last 10 messages
		const messageList = await gmail.users.messages.list({
			userId: 'me',
			maxResults: 10,
		});

		if (!messageList.data.messages) {
			return Response.json({ message: 'No messages found', count: 0, messages: [] });
		}

		// Get details for each message
		const messages = await Promise.all(
			messageList.data.messages.map(async (message) => {
				const msg = await gmail.users.messages.get({
				userId: 'me',
				id: message.id!,
				});

				return {
				id: msg.data.id,
				snippet: msg.data.snippet,
				headers: msg.data.payload?.headers?.reduce((acc: any, header) => {
					acc[header.name!.toLowerCase()] = header.value;
					return acc;
				}, {}),
				};
			})
		);

		return Response.json({
			message: 'Successfully fetched messages',
			count: messages.length,
			messages,
		});

	} catch (error) {
		console.error('Error scanning Gmail:', error);
		return Response.json(
			{ error: 'Failed to scan Gmail messages' },
			{ status: 500 }
		);
	}
}
