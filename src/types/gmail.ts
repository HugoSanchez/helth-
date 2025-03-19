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
 * Classification result for a single email
 */
export interface EmailClassification {
    /** Gmail message ID */
    id: string;
    /** Email subject */
    subject: string;
    /** From address */
    from: string;
    /** Email date */
    date: string;
    /** Classification results */
    classification: {
        /** Whether the email contains medical information */
        isMedical: boolean;
        /** Confidence score of the classification */
        confidence: number;
    };
    /** Attachment information */
    attachments: GmailAttachment[];
}

/**
 * Response format for the Gmail scan endpoint
 */
export interface GmailScanResponse {
    /** Status message indicating the result of the operation */
    message: string;
    /** Total number of emails with attachments found */
    total: number;
    /** Number of emails classified as medical */
    medicalCount: number;
    /** Classification results for all emails with attachments */
    results: EmailClassification[];
}
