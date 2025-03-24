import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    defaultHeaders: { "OpenAI-Beta": "assistants=v2" }
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
        model: "gpt-4-1106-preview",
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
            },
            {
                type: "file_search"
            }
        ],
        instructions: `You are a medical document analyzer. Your task is to analyze medical documents and extract structured information.
            IMPORTANT: You must ALWAYS return your analysis using the processHealthRecord function. DO NOT provide analysis in text form.

            Follow these steps exactly:
            1. Read and analyze the document using file_search
            2. Structure your findings using ONLY the processHealthRecord function with these fields:
               - record_type: Choose from the allowed types
               - record_name: Create a clear, descriptive name
               - summary: Provide a concise summary of key information
               - doctor_name: Include if present (or null if not found)
               - date: Use YYYY-MM-DD format (or null if not found)

            DO NOT write any text responses. ONLY use the processHealthRecord function to return your analysis.`
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

    // Step 1: Create a new thread
    const thread = await openai.beta.threads.create();

    // Step 2: Add the message with file attachment
    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Analyze this medical document and return the results using ONLY the processHealthRecord function. Do not provide any text response.`,
        attachments: [{
            file_id: fileId,
            tools: [{ type: 'file_search' }]
        }]
    } as any);

    // Step 3: Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: DOCUMENT_ANALYZER_ASSISTANT_ID,
        instructions: "Analyze the document and call processHealthRecord with the results. You MUST use the processHealthRecord function to return your analysis.",
        tools: [{
            type: "function",
            function: {
                name: "processHealthRecord",
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
        }]
    });

    try {
        // Step 4: Poll for completion and get results
        let result: HealthRecord;
        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            console.log('[OpenAI] Run status:', runStatus.status);

            if (runStatus.status === 'completed') {
                console.log('[OpenAI] Run completed, fetching messages');
                const messages = await openai.beta.threads.messages.list(thread.id);
                const lastMessage = messages.data[0];
                console.log('[OpenAI] Last message:', JSON.stringify(lastMessage, null, 2));

                // Extract the function call results
                // @ts-ignore - OpenAI's types are not up to date for function calls
                if (lastMessage.role === 'assistant' && lastMessage.function_calls?.[0]) {
                    console.log('[OpenAI] Found function calls in message');
                    // @ts-ignore - OpenAI's types are not up to date for function calls
                    const functionCall = lastMessage.function_calls[0];
                    console.log('[OpenAI] Function call:', JSON.stringify(functionCall, null, 2));

                    if (functionCall.name === 'processHealthRecord') {
                        console.log('[OpenAI] Processing health record');
                        result = JSON.parse(functionCall.arguments);
                        break;
                    }
                }
                console.log('[OpenAI] No valid function call found');
                throw new Error('No valid function call found in assistant response');
            }

            if (runStatus.status === 'requires_action') {
                console.log('[OpenAI] Run requires action, submitting tool outputs');

                // Get the required action details
                const requiredAction = runStatus.required_action;
                if (requiredAction?.type === 'submit_tool_outputs') {
                    // Submit empty tool outputs to let the assistant proceed
                    await openai.beta.threads.runs.submitToolOutputs(
                        thread.id,
                        run.id,
                        {
                            tool_outputs: requiredAction.submit_tool_outputs.tool_calls.map(toolCall => ({
                                tool_call_id: toolCall.id,
                                output: JSON.stringify({ success: true })
                            }))
                        }
                    );
                    console.log('[OpenAI] Submitted tool outputs');
                    continue;
                }
            }

            if (runStatus.status === 'failed') {
                console.log('[OpenAI] Run failed:', runStatus.last_error);
                throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
            }

            console.log('[OpenAI] Waiting for completion...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return result;
    } finally {
        // Clean up by deleting the thread
        try {
            await openai.beta.threads.del(thread.id);
        } catch (error) {
            console.error('Failed to delete thread:', error);
        }
    }
}
