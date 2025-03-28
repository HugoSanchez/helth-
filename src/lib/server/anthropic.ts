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
 * @param language - The language to use for the summary (e.g. 'en', 'es')
 * @returns The analyzed document information
 */
export async function analyzeDocument(base64Pdf: string, language: string = 'en') {
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
                    required: ["record_type", "record_name", "display_name", "summary"]
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
                            text: `Please analyze this medical document and extract the key information using the processHealthRecord function.

							    For the record_type field, make you don't miss lab results.
							    For the record_subtype field, we're looking for more specific information For instance, good examples would include:
								  - Bloodwork
								  - Heart scan
								  - X-ray
								  - CT scan
								  - MRI
								  - Ultrasound
								  - EKG
								  - EEG

                                Keep record_type and record_subtype in English for consistency.

                                Provide the summary and display_name in ${language}. Make sure to use appropriate medical terminology in the target language.

								For the record_name field (used for storage), generate a clean filename that:
									1. Describes the type and key information (e.g., "blood-work" for a CBC)
									2. Uses only lowercase letters, numbers, and hyphens
									3. Does not include special characters or spaces
									4. Ends with .pdf

									Example record_names:
									- blood-work-march-2024.pdf
									- chest-xray-2024.pdf
									- metformin-prescription.pdf
									- cardiology-notes-march-2024.pdf

                                For the display_name field (shown to users), create a descriptive name that:
                                    1. Is very short and in the user's language (${language})
                                    2. Includes the type of document (bloodwork, xray, etc)
                                    3. Can include spaces and proper capitalization
                                    4. Is very short, only key words

									Example display_names in English:
									- Blood Count Results
									- Chest X-Ray Report
									- Metformin Prescription
									- Cardiology Consultation Notes

                                Example display_names in Spanish:
                                - Resultados del Análisis de Sangre Completo - Marzo 2024
                                - Radiografía de Tórax
                                - Receta de Metformina - Dr. Smith
                                - Notas de Consulta Cardiológica

								Please only return the JSON object, nothing else.`
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
            throw new Error('No valid analysis from Claude');
        }

        console.log('[Claude] Analysis successful:', analysis);
        return analysis;
    } catch (error) {
        console.error('[Claude] Error in analyzeDocument:', error);
        throw error;
    }
}
