/**
 * Represents a processed Gmail message with essential fields
 */
export interface GmailMessage {
    /** Unique identifier of the email */
    id: string;
    /** Email subject line */
    subject: string;
    /** Sender's email address */
    from: string;
    /** Date the email was sent */
    date: string;
    /** Decoded email body content */
    body: string;
    /** Array of attachments found in the email */
    attachments: Array<GmailAttachment>;
}

/**
 * Represents an email attachment with its metadata
 */
export interface GmailAttachment {
    /** Unique identifier of the attachment */
    id: string;
    /** Name of the attachment file */
    filename: string;
    /** MIME type of the attachment */
    mimeType: string;
}

/**
 * Response format for the frontend
 */
export interface GmailScanResponse {
    /** Status message indicating the result of the operation */
    message: string;
    /** Total number of emails processed */
    total: number;
    /** Number of medical emails found */
    count: number;
    /** Array of processed messages with their classifications */
    messages: Array<{
        id: string;
        subject: string;
        classification: {
            isMedical: boolean;
            confidence: number;
        };
    }>;
    /** Indicates if the scanning process is complete */
    done: boolean;
}
