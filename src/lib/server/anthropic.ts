import Anthropic from '@anthropic-ai/sdk';
import { HealthRecord } from '@/types/health';

if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyzes a PDF document using Claude's API
 * Uses function calling to ensure structured response
 *
 * @param base64Pdf - The PDF file content as base64 string
 * @returns The analyzed document information
 */
export async function analyzeDocument(base64Pdf: string) {
    try {
        console.log('[Claude] Sending request to Claude API...');
        const response = await anthropic.beta.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            tools: [{
                name: "processHealthRecord",
                description: "Process and structure medical document information",
                input_schema: {
                    type: "object",
                    properties: {
                        record_type: {
                            type: "string",
                            enum: ["lab_report", "prescription", "imaging", "clinical_notes", "other"],
                            description: "The type of medical record"
                        },
                        record_name: {
                            type: "string",
                            description: "A descriptive name for the record"
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
                    required: ["record_type", "record_name", "summary"]
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
                            text: "Please analyze this medical document and extract the key information using the processHealthRecord function. Please only return the JSON object, nothing else."
                        },
                    ],
                },
            ],
            betas: ["token-efficient-tools-2025-02-19"]
        });

        console.log('[Claude] Response received:', JSON.stringify(response, null, 2));

        // Parse Claude's response
        let analysis = null;
        for (const content of response.content) {
            console.log('[Claude] Processing content type:', content.type);
            // @ts-ignore - Beta feature not yet in types
            if (content.type === 'tool_use') {
                // @ts-ignore - Beta feature not yet in types
                analysis = content.input;
                console.log('[Claude] Found tool_use response:', analysis);
                break;
            }
        }

        if (!analysis) {
            console.log('[Claude] No analysis found in response');
            throw new Error('No valid analysis from Claude');
        }

        console.log('[Claude] Analysis successful:', analysis);
        return analysis;
    } catch (error) {
        console.error('[Claude] Error in analyzeDocument:', error);
        throw error;
    }
}
