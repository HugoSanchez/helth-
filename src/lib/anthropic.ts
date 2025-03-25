import Anthropic from '@anthropic-ai/sdk';
import { HealthRecord } from '@/types/health';

if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyzes a medical document using Claude
 * @param fileContent - The content of the file as a base64 string
 * @param filename - The original name of the file
 * @returns Promise<HealthRecord> - Structured analysis of the document
 */
export async function analyzeDocument(fileContent: string, filename: string): Promise<HealthRecord> {
    const message = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 4096,
        temperature: 0.1, // Low temperature for more consistent, structured output
        messages: [{
            role: "user",
            content: `You are a medical document analyzer. Analyze this medical document and extract the key information in JSON format.

Document filename: ${filename}
Document content: ${fileContent}

Return your analysis in this exact JSON structure:
{
    "record_type": "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other",
    "record_name": "descriptive name of the document",
    "summary": "comprehensive summary of key information",
    "doctor_name": "provider name if present, null if not found",
    "date": "YYYY-MM-DD format if present, null if not found"
}`
        }]
    });

    // Extract and validate the JSON response
    try {
        const response = message.content[0].text;
        const result = JSON.parse(response) as HealthRecord;

        // Validate required fields
        if (!result.record_type || !result.record_name || !result.summary) {
            throw new Error('Missing required fields in analysis result');
        }

        return result;
    } catch (error) {
        console.error('Failed to parse Claude response:', error);
        throw new Error('Failed to analyze document');
    }
}
