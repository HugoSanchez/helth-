import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const DOCUMENT_ANALYZER_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

/**
 * Creates a new OpenAI Assistant for analyzing medical documents.
 * This function should be run ONCE to create the assistant, and the resulting ID
 * should be stored in the OPENAI_ASSISTANT_ID environment variable.
 *
 * The assistant is configured with:
 * - A function tool for structured output
 * - Specific instructions for medical document analysis
 * - The gpt-4o-mini model for cost-effective, accurate analysis
 *
 * @returns {Promise<string>} The ID of the created assistant
 */
export async function createDocumentAnalyzer() {
    const assistant = await openai.beta.assistants.create({
        name: "Medical Document Analyzer",
        model: "gpt-4o-mini",
        tools: [
            {
                type: "function",
                function: {
                    name: "processHealthRecord",
                    description: "Process and structure medical document information",
                    parameters: {
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
                }
            }
        ],
        instructions: `You are a medical document analyzer. Your task is to analyze medical documents and extract structured information.
			Always use the processHealthRecord function to return your analysis.
			Be precise and thorough in your analysis while maintaining a clear and concise summary.
			Pay special attention to document type, dates, provider information, and key medical findings.

			Guidelines for analysis:
			1. Determine the correct record_type based on document content
			2. Create a descriptive record_name that reflects the main purpose
			3. Write a concise but informative summary
			4. Extract doctor's name when available
			5. Find and format dates in YYYY-MM-DD format`
    });

    console.log('Created assistant with ID:', assistant.id);
    return assistant.id;
}

interface EmailContent {
    id: string;
    subject: string;
    body: string;
    from: string;
    date: string;
    attachments: Array<{
        id: string;
        filename: string;
        mimeType: string;
    }>;
}

interface MedicalAnalysis {
    isMedical: boolean;
    confidence: number;
    category: "lab_result" | "appointment" | "prescription" | "insurance" | "general_medical" | null;
    relevantInformation: string | null;
}

interface DocumentAnalysis {
    type: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other";
    summary: string;
    keyFindings: string[];
    dates: {
        documentDate?: string;
        testDate?: string;
        followUpDate?: string;
    };
    provider: {
        name?: string;
        facility?: string;
    };
    measurements?: Record<string, {
        value: string;
        unit: string;
        normalRange?: string;
        isAbnormal?: boolean;
    }>;
}

export interface AnalyzedEmail extends EmailContent, MedicalAnalysis {
    documentAnalysis?: DocumentAnalysis[];
}

interface SubjectScreeningResult {
    id: string;
    isMedical: boolean;
    confidence: number;
}

// New function to screen email subjects in batches
export async function screenEmailSubjects(emails: { id: string; subject: string }[]): Promise<SubjectScreeningResult[]> {
    // Process in batches of 20 subjects to keep prompts manageable
    const batchSize = 20;
    const results: SubjectScreeningResult[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(emails.length/batchSize)}`);

        console.log('Sending request to OpenAI...');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a medical email classifier. Analyze email subjects to determine if they are medical-related."
                },
                {
                    role: "user",
                    content: `Analyze these email subjects and determine if they are likely medical-related:
                        ${batch.map(email => `ID: ${email.id}
                        Subject: ${email.subject}`).join('\n\n')}

                        Consider medical if related to:
                        - Healthcare appointments
                        - Medical test results
                        - Prescriptions
                        - Insurance claims
                        - Hospital/clinic communications
                        - Lab reports
                        - Medical procedures
                        - Health records`
                }
            ],
            functions: [
                {
                    name: "classifyEmails",
                    description: "Classify email subjects as medical or non-medical",
                    parameters: {
                        type: "object",
                        properties: {
                            classifications: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: {
                                            type: "string",
                                            description: "The ID of the email"
                                        },
                                        isMedical: {
                                            type: "boolean",
                                            description: "Whether the email is medical-related"
                                        },
                                        confidence: {
                                            type: "number",
                                            description: "Confidence score between 0 and 1"
                                        }
                                    },
                                    required: ["id", "isMedical", "confidence"]
                                }
                            }
                        },
                        required: ["classifications"]
                    }
                }
            ],
            function_call: { name: "classifyEmails" }
        });
        console.log('Received response from OpenAI');

        if (!response.choices[0].message.function_call) {
            console.error('No function call in OpenAI response');
            throw new Error('Expected function call in response');
        }

        try {
            const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments);
            results.push(...functionArgs.classifications);
            console.log(`Successfully processed batch ${i/batchSize + 1}`);
        } catch (error) {
            console.error('Failed to parse function call arguments:', error);
            throw new Error('Could not process OpenAI response');
        }
    }

    console.log('All batches processed. Total results:', results.length);
    return results;
}

export async function analyzeEmailContent(email: EmailContent): Promise<AnalyzedEmail> {
    const prompt = `Analyze this email and determine if it contains medical information. The email details are:

        Subject: ${email.subject}
        From: ${email.from}
        Date: ${email.date}
        Attachments: ${email.attachments.map(a => a.filename).join(', ') || 'None'}
        Body:
        ${email.body}

        Provide your analysis in the following JSON format:
        {
            "isMedical": boolean,
            "confidence": number between 0 and 1,
            "category": "lab_result" | "appointment" | "prescription" | "insurance" | "general_medical" | null,
            "relevantInformation": "brief summary of key medical information if any, otherwise null"
        }`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are a medical document analyzer. Your task is to identify emails containing medical information and extract relevant details."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
        throw new Error('No response content from OpenAI');
    }

    const analysis = JSON.parse(response.choices[0].message.content) as MedicalAnalysis;

    return {
        ...email,
        ...analysis,
    };
}

// Add a type that matches our DB schema
interface HealthRecord {
    record_type: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other"
    record_name: string
    summary: string
    doctor_name: string | null
    date: string | null
}

/**
 * Analyzes a medical document using OpenAI's Assistant API.
 * This function:
 * 1. Creates a new thread
 * 2. Adds the document to the thread
 * 3. Runs the analysis
 * 4. Polls for completion
 * 5. Returns structured results
 *
 * @param fileId - The ID of the file uploaded to OpenAI
 * @param filename - The original name of the file
 * @returns Promise<HealthRecord> - Structured analysis of the document
 * @throws Error if assistant ID is missing or analysis fails
 */
export async function analyzeDocument(fileId: string, filename: string): Promise<HealthRecord> {
    if (!DOCUMENT_ANALYZER_ASSISTANT_ID) {
        throw new Error('Missing OPENAI_ASSISTANT_ID environment variable');
    }

    // Step 1: Create a new thread for this analysis
    const thread = await openai.beta.threads.create();

    // Step 2: Add the document to the thread
    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Analyze this medical document named "${filename}" and extract key information.`,
        // @ts-ignore - OpenAI's types are not up to date
        file_ids: [fileId]
    });

    // Step 3: Run the assistant with our function
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: DOCUMENT_ANALYZER_ASSISTANT_ID,
        tools: [{
            type: "function",
            function: {
                name: "processHealthRecord",
                description: "Process and structure medical document information",
                parameters: {
                    type: "object",
                    properties: {
                        record_type: {
                            type: "string",
                            enum: ["lab_report", "prescription", "imaging", "clinical_notes", "other"],
                            description: "The type of medical record"
                        },
                        record_name: {
                            type: "string",
                            description: "A descriptive name for the record, based on its contents"
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
            }
        }]
    });

    // Step 4: Poll for completion and get results
    let result: HealthRecord;
    while (true) {
        // Check the status of the analysis
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

        if (runStatus.status === 'completed') {
            // Get the assistant's response
            const messages = await openai.beta.threads.messages.list(thread.id);
            const lastMessage = messages.data[0];  // Get the most recent message

            // Extract the function call results
            // @ts-ignore - OpenAI's types are not up to date for function calls
            if (lastMessage.role === 'assistant' && lastMessage.function_calls?.[0]) {
                // @ts-ignore - OpenAI's types are not up to date for function calls
                const functionCall = lastMessage.function_calls[0];
                if (functionCall.name === 'processHealthRecord') {
                    // Parse the analysis results
                    result = JSON.parse(functionCall.arguments);
                    break;
                }
            }
            throw new Error('No valid function call found in assistant response');
        }

        // Handle failed runs
        if (runStatus.status === 'failed') {
            throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
        }

        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 5: Clean up by deleting the thread
    await openai.beta.threads.del(thread.id);

    // Return the structured analysis
    return result;
}
