import Anthropic from '@anthropic-ai/sdk';
import { HealthRecord } from '@/types/health';

if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface DocumentAnalysis {
    status: "success" | "error";
    error_type?: "not_medical_document" | "encrypted_pdf" | "unreadable_content" | "unsupported_language" | "empty_document" | "unknown";
    error_message?: string;
    record_type?: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other";
    record_subtype?: string;
    record_name?: string;
    display_name?: string;
    summary?: string;
    doctor_name?: string;
    date?: string;
}

export interface EmailClassificationResult {
    id: string;
    isMedical: boolean;
    confidence: number;
    reason?: string;
}

/**
 * Analyzes a PDF document using Claude's API
 * Uses function calling to ensure structured response
 *
 * @param base64Pdf - The PDF file content as base64 string
 * @param language - The language to use for the summary (e.g. 'en', 'es')
 * @returns The analyzed document information
 */
export async function analyzeDocument(base64Pdf: string, language: string = 'en'): Promise<DocumentAnalysis> {
    try {
        console.log('[Claude] Sending request to Claude API...');
        const response = await anthropic.beta.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            tools: [{
                name: "processHealthRecord",
                description: "Process and structure medical document information, with error handling for non-medical or unreadable documents",
                input_schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["success", "error"],
                            description: "The status of the analysis"
                        },
                        error_type: {
                            type: "string",
                            enum: [
                                "not_medical_document",
                                "encrypted_pdf",
                                "unreadable_content",
                                "unsupported_language",
                                "empty_document",
                                "unknown"
                            ],
                            description: "The type of error encountered during analysis"
                        },
                        error_message: {
                            type: "string",
                            description: "A human-readable description of the error"
                        },
                        record_type: {
                            type: "string",
                            enum: ["lab_report", "prescription", "imaging", "clinical_notes", "other"],
                            description: "The type of medical record"
                        },
                        record_subtype: {
                            type: "string",
                            description: "Optional subtype of the record"
                        },
                        record_name: {
                            type: "string",
                            description: "A clean, system-friendly filename for storage"
                        },
                        display_name: {
                            type: "string",
                            description: "A human-readable, descriptive name in the user's language"
                        },
                        summary: {
                            type: "string",
                            description: "A brief summary of the document's key information"
                        },
                        doctor_name: {
                            type: "string",
                            description: "The name of the healthcare provider, if present"
                        },
                        date: {
                            type: "string",
                            description: "The document date in ISO format (YYYY-MM-DD), if present"
                        }
                    },
                    required: ["status"]
                }
            }],
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: base64Pdf,
                            },
                        },
                        {
                            type: 'text',
                            text: `Please analyze this document and extract key information using the processHealthRecord function.

                            First, verify if this is a valid, readable medical document:
                            1. Check if you can read and understand the content
                            2. Verify if it's actually a medical document
                            3. If either check fails, return an error with appropriate error_type and message

                            If the document is valid and medical in nature, extract the information as follows:

                            For the record_type field:
                            - Carefully identify if it's a lab report, prescription, imaging report, or clinical notes
                            - Don't miss lab results or prescriptions
                            - Use "other" only if truly cannot be categorized

                            For the record_subtype field, provide specific information like:
                            - Bloodwork
                            - Heart scan
                            - X-ray
                            - CT scan
                            - MRI
                            - Ultrasound
                            - EKG
                            - EEG

                            Keep record_type and record_subtype in English for consistency.

                            Provide the summary and display_name in ${language}. Use appropriate medical terminology in the target language.

                            For the record_name field (used for storage), generate a clean filename that:
                            1. Describes the type and key information
                            2. Uses only lowercase letters, numbers, and hyphens
                            3. Does not include special characters or spaces
                            4. Ends with .pdf

                            For the display_name field (shown to users), create a descriptive name that:
                            1. Is very short and in the user's language (${language})
                            2. Includes the type of document
                            3. Can include spaces and proper capitalization
                            4. Is very short, only key words

                            Please return only the JSON object, nothing else.`
                        },
                    ],
                },
            ],
            betas: ["token-efficient-tools-2025-02-19"]
        });

        // Parse Claude's response
        let analysis = null;
        for (const content of response.content) {
            // @ts-ignore - Beta feature not yet in types
            if (content.type === 'tool_use') {
                // @ts-ignore - Beta feature not yet in types
                analysis = content.input;
                break;
            }
        }

        if (!analysis) {
            console.log('[Claude] No analysis found in response');
            return {
                status: 'error',
                error_type: 'unknown',
                error_message: 'No valid analysis from Claude'
            };
        }

        console.log('[Claude] Analysis result:', analysis);
        return analysis as DocumentAnalysis;
    } catch (error) {
        console.error('[Claude] Error in analyzeDocument:', error);
        throw error;
    }
}

/**
 * Classifies a batch of emails using Claude's API to determine if they are medical-related
 *
 * @param emails - Array of email objects containing id, subject, and snippet
 * @returns Array of classification results
 */
export async function classifyEmails(emails: Array<{ id: string, subject: string, snippet: string }>): Promise<EmailClassificationResult[]> {
    try {
        console.log('[Claude] Classifying batch of emails:', emails.length);
        const response = await anthropic.beta.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            tools: [{
                name: "classifyEmail",
                description: "Classify every single email as medical or non-medical",
                input_schema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The email ID that was passed"
                        },
                        isMedical: {
                            type: "boolean",
                            description: "Whether the email is medical-related"
                        },
                        confidence: {
                            type: "number",
                            description: "Confidence score between 0.0 and 1.0"
                        }
                    },
                    required: ["id", "isMedical", "confidence"]
                }
            }],
            messages: [
                {
                    role: 'user',
                    content: `Classify each of these emails as medical or non-medical. For each email, call the classifyEmail function with your classification. Please return all emails at once instead of going one by one.

							Medical emails are those that:
							- Contain medical terminology
							- Discuss health conditions or treatments
							- Are from healthcare providers
							- Contain test results or appointments
							- Discuss insurance claims

							Here are the emails:
							${emails.map(email => `
							ID: ${email.id}
							Subject: ${email.subject}
							Content: ${email.snippet}
							---`).join('\n')}

					Remember: Call classifyEmail once for each email with your classification.`
                }
            ],
            betas: ["token-efficient-tools-2025-02-19"]
        });

        // Parse Claude's response
        const results: EmailClassificationResult[] = [];
        for (const content of response.content) {
            // @ts-ignore - Beta feature not yet in types
            if (content.type === 'tool_use') {
                // @ts-ignore - Beta feature not yet in types
                results.push(content.input);
            }
        }

        // If we got no results, return defaults
        if (results.length === 0) {
            console.log('[Claude] No classifications found in response');
            throw new Error('No classifications received from Claude');
        }

        console.log('[Claude] Classification results:', results);
        return results;
    } catch (error) {
        console.error('[Claude] Error in classifyEmails:', error);
        return emails.map(email => ({
            id: email.id,
            isMedical: false,
            confidence: 0.5
        }));
    }
}
