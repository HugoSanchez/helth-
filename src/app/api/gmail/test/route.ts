// =============================================================================
// GMAIL EMAIL PROCESSING ENDPOINT
// =============================================================================
// This endpoint handles the processing of Gmail emails to find and extract medical
// documents. It implements a secure, paginated approach to process emails in
// batches, analyze attachments, and store relevant medical documents.
// =============================================================================

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { classifyEmails, analyzeDocument } from '@/lib/server/anthropic'
import { gmail_v1 } from 'googleapis/build/src/apis/gmail/v1'
import { storeDocument } from '@/lib/server/db'
import { GaxiosPromise, GaxiosResponse } from 'gaxios'

// Maximum number of emails to process in a single batch
// This helps prevent timeouts and memory issues
const BATCH_SIZE = 100

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Interface for tracking email processing statistics
 * These stats are maintained across multiple batches of email processing
 * and are returned to the client for progress monitoring
 */
interface ProcessingStats {
    totalProcessed: number;  // Total number of emails examined
    totalMedical: number;    // Number of emails classified as medical-related
    totalDocuments: number;  // Number of medical documents successfully stored
}

// =============================================================================
// GMAIL CLIENT INITIALIZATION
// =============================================================================

/**
 * Initializes and configures a Gmail API client with OAuth2 credentials
 *
 * Authentication Flow:
 * 1. Creates OAuth2 client with application credentials
 * 2. Sets up user-specific access token
 * 3. Initializes Gmail API client with authenticated credentials
 *
 * @param access_token - The user's Gmail API access token
 * @returns Configured Gmail API client instance
 */
async function initializeGmailClient(access_token: string): Promise<gmail_v1.Gmail> {
    // Create new OAuth2 client with our application credentials
    // These credentials identify our application to Google
    const oauth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    )

    // Configure the client with user's access token
    // This token allows us to make requests on behalf of the user
    oauth2Client.setCredentials({
        access_token: access_token,
    })

    // Create and return Gmail client instance
    // This client will be used for all Gmail API operations
    return google.gmail({ version: 'v1', auth: oauth2Client })
}

// =============================================================================
// EMAIL BATCH PROCESSING
// =============================================================================

/**
 * Processes a batch of emails from Gmail, identifying and extracting medical documents
 *
 * Detailed Processing Flow:
 * 1. Email Fetching:
 *    - Retrieves a batch of emails with attachments
 *    - Uses pagination token for batch processing
 *
 * 2. Email Processing:
 *    - Extracts email details (subject, snippet, etc.)
 *    - Prepares data for medical content classification
 *
 * 3. Medical Classification:
 *    - Sends email data to Claude for medical relevance analysis
 *    - Updates statistics for processed emails
 *
 * 4. Document Handling:
 *    - For medical emails, processes each PDF attachment
 *    - Converts attachments to appropriate format
 *    - Sends documents to Claude for analysis
 *    - Stores validated medical documents
 *
 * Error Handling:
 * - Implements graceful failure for individual attachments
 * - Maintains processing state for batch recovery
 * - Logs errors for debugging while continuing processing
 *
 * @param gmail - Initialized Gmail API client
 * @param pageToken - Token for paginated email fetching
 * @param stats - Running statistics object for tracking progress
 * @param userId - User ID for document storage
 */
async function processEmailBatch(
    gmail: gmail_v1.Gmail,
    pageToken: string | undefined,
    stats: ProcessingStats,
    userId: string
): Promise<void> {
    try {
        // STEP 1: Fetch Batch of Emails
        // -------------------------------------
        // Query Gmail API for emails with attachments
        // This reduces API calls by filtering server-side
        const response: GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
            userId: 'me',
            maxResults: BATCH_SIZE,
            pageToken,
            q: 'has:attachment' // Only fetch emails with attachments for efficiency
        })

        // Early exit if no messages found in this batch
        // This prevents unnecessary processing and API calls
        if (!response.data.messages?.length) {
            console.log('No more messages found in this batch')
            return
        }

        // STEP 2: Gather Detailed Email Information
        // -------------------------------------
        // For each email in the batch, fetch full details
        // This includes headers, body, and attachment metadata
        const emailDetails = await Promise.all(response.data.messages.map(async (message) => {
            // Get complete message data including all MIME parts
            const details = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!
            })

            // Extract relevant fields for classification
            // Headers contain subject and other metadata
            // Snippet provides a preview of the email content
            const subject = details.data.payload?.headers?.find(h => h.name === 'Subject')?.value || ''
            const snippet = details.data.snippet || ''

            return {
                id: message.id!,
                subject,
                snippet,
                details: details.data
            }
        }))

        // STEP 3: Medical Content Classification
        // -------------------------------------
        // Send batch to Claude for medical relevance analysis
        // This reduces API calls by processing multiple emails at once
        const classifications = await classifyEmails(emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            snippet: email.snippet
        })))

        // STEP 4: Process Medical Emails
        // -------------------------------------
        // Iterate through classified emails and handle medical content
        for (const classification of classifications) {
            // Update processing statistics
            stats.totalProcessed++

            // Process only emails classified as medical
            if (classification.isMedical) {
                stats.totalMedical++
                const email = emailDetails.find(e => e.id === classification.id)

                // Skip if email has no attachments
                if (!email?.details.payload?.parts) continue

                // STEP 5: Extract Attachments
                // -------------------------------------
                // Find all attachments in the email
                // Filter for parts that have both filename and attachment ID
                const attachments = email.details.payload.parts.filter(part =>
                    part.filename && part.body?.attachmentId
                )

                // STEP 6: Process Individual Attachments
                // -------------------------------------
                for (const attachment of attachments) {
                    try {
                        // Skip non-PDF attachments
                        // Currently we only support PDF processing
                        if (attachment.mimeType !== 'application/pdf') {
                            console.log(`Skipping non-PDF attachment: ${attachment.filename} (${attachment.mimeType})`)
                            continue
                        }

                        // Download attachment data
                        // Gmail returns base64 encoded data
                        const attachmentData = await gmail.users.messages.attachments.get({
                            userId: 'me',
                            messageId: email.id,
                            id: attachment.body!.attachmentId!
                        })

                        // Skip if no data received
                        if (!attachmentData.data.data) continue

                        // STEP 7: Data Transformation
                        // -------------------------------------
                        // Convert Gmail's URL-safe base64 to standard base64
                        // This is necessary for proper PDF processing
                        const base64Data = attachmentData.data.data.replace(/-/g, '+').replace(/_/g, '/')
                        const buffer = Buffer.from(base64Data, 'base64')

                        // STEP 8: Document Analysis
                        // -------------------------------------
                        // Send document to Claude for medical content analysis
                        const analysis = await analyzeDocument(base64Data)

                        // STEP 9: Document Storage
                        // -------------------------------------
                        // Store document if analysis confirms it's medical
                        if (analysis.status === 'success') {
                            const storedDoc = await storeDocument(userId, attachment.filename!, buffer, analysis)
                            if (storedDoc) {
                                stats.totalDocuments++
                            }
                        }
                    } catch (error) {
                        // Log error but continue processing other attachments
                        // This ensures one failed attachment doesn't stop the whole process
                        console.error(`Error processing attachment ${attachment.filename}:`, error)
                        continue
                    }
                }
            }
        }

        // STEP 10: Handle Pagination
        // -------------------------------------
        // Recursively process next batch if more emails exist
        // This ensures we process all available emails
        if (response.data.nextPageToken) {
            await processEmailBatch(gmail, response.data.nextPageToken, stats, userId)
        }
    } catch (error) {
        console.error('Error processing email batch:', error)
        throw error
    }
}

// =============================================================================
// MAIN ENDPOINT HANDLER
// =============================================================================

/**
 * POST Handler for Email Processing
 *
 * Security Features:
 * - User authentication validation
 * - Gmail account ownership verification
 * - Token expiration checking
 * - Post-processing token cleanup
 *
 * Processing Pipeline:
 * 1. Authentication & Validation
 * 2. Gmail Client Setup
 * 3. Batch Processing
 * 4. Security Cleanup
 * 5. Results Reporting
 *
 * Error Handling:
 * - Authentication failures
 * - Gmail API errors
 * - Processing errors
 * - Cleanup failures
 *
 * @param request - Incoming HTTP request
 * @returns JSON response with processing results or error
 */
export async function POST(request: Request) {
    try {
        // STEP 1: Authentication Setup
        // -------------------------------------
        // Initialize Supabase client for auth operations
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Verify user authentication
        // This ensures only authenticated users can access the endpoint
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // STEP 2: Gmail Account Verification
        // -------------------------------------
        // Retrieve user's Gmail credentials from database
        // This confirms the user has connected their Gmail account
        const { data: gmailAccount, error: gmailError } = await supabase
            .from('gmail_accounts')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (gmailError || !gmailAccount) {
            console.error('Gmail account not found:', gmailError)
            return NextResponse.json(
                { error: 'Gmail account not connected' },
                { status: 400 }
            )
        }

        // STEP 3: Token Validation
        // -------------------------------------
        // Check if the Gmail access token has expired
        // This prevents failed API calls due to expired credentials
        if (new Date(gmailAccount.token_expires_at) <= new Date()) {
            return NextResponse.json(
                { error: 'Gmail token expired. Please reconnect your account.' },
                { status: 401 }
            )
        }

        // STEP 4: Gmail Client Initialization
        // -------------------------------------
        // Set up authenticated Gmail client for API operations
        const gmail = await initializeGmailClient(gmailAccount.access_token)

        // STEP 5: Request Processing
        // -------------------------------------
        // Extract pagination parameters from request
        const { sessionId, pageToken } = await request.json()

        // Initialize statistics tracking
        const stats: ProcessingStats = {
            totalProcessed: 0,
            totalMedical: 0,
            totalDocuments: 0
        }

        // STEP 6: Email Processing
        // -------------------------------------
        // Process emails and track statistics
        await processEmailBatch(gmail, pageToken, stats, user.id)

        // STEP 7: Security Cleanup
        // -------------------------------------
        // Remove Gmail tokens after processing
        // This enhances security by limiting token lifetime
        console.log('[Test] Cleaning up Gmail tokens...')
        const { error: cleanupError } = await supabase
            .from('gmail_accounts')
            .delete()
            .eq('user_id', user.id)

        if (cleanupError) {
            console.error('[Test] Error cleaning up Gmail tokens:', cleanupError)
            // Continue despite cleanup error
            // The main processing was successful, so we don't fail the request
        }

        // STEP 8: Response
        // -------------------------------------
        // Return success response with processing statistics
        return NextResponse.json({
            success: true,
            stats,
            message: "Processing completed and tokens cleaned up"
        })

    } catch (error) {
        // Error Handling
        // -------------------------------------
        // Log error for debugging and return appropriate error response
        console.error('Error processing emails:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
