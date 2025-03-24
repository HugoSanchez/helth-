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
                type: "retrieval"  // Enable file searching
            },
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
        instructions: `You analyze medical records in PDF format. Your task is to extract and structure key information from these documents.

            CRITICAL INSTRUCTIONS:
            1. You MUST ALWAYS use the processHealthRecord function to return your analysis
            2. DO NOT write any text responses or explanations
            3. DO NOT analyze the document in free text form
            4. ALWAYS return your findings through the function call

            Analysis Process:
            1. Read the entire document carefully
            2. Identify the type of medical record (lab_report, prescription, etc.)
            3. Create a clear, descriptive name for the record
            4. Write a comprehensive summary of key information
            5. Look for and extract:
               - Healthcare provider's name
               - Relevant dates (use YYYY-MM-DD format)
               - Key medical findings
               - Important details about treatments or recommendations

            Example Function Call:
            processHealthRecord({
                record_type: "lab_report",
                record_name: "Comprehensive Metabolic Panel Results",
                summary: "Blood chemistry panel showing normal liver function, slightly elevated glucose (110 mg/dL), and normal kidney function markers. All other values within reference range.",
                doctor_name: "Dr. Sarah Johnson",
                date: "2024-02-15"
            })`
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

    // Step 2: Add the message with file attachment using file_ids
    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: "Please analyze this medical document and extract the relevant information.",
        file_ids: [fileId]
    } as any);  // Type assertion needed as the SDK types are not up to date

    // Step 3: Run the assistant with explicit function definition
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: DOCUMENT_ANALYZER_ASSISTANT_ID,
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
        ]
    });

    try {
        // Step 4: Poll for completion with improved handling
        let result: HealthRecord;

        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            console.log('[OpenAI] Run status:', runStatus.status);

            if (runStatus.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(thread.id);
                const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');

                for (const message of assistantMessages) {
                    // @ts-ignore - OpenAI's types are not up to date
                    if (message.content && message.content[0]?.type === 'tool_calls') {
                        // @ts-ignore - OpenAI's types are not up to date
                        const toolCall = message.content[0].tool_calls[0];
                        if (toolCall.function.name === 'processHealthRecord') {
                            result = JSON.parse(toolCall.function.arguments);
                            return result;
                        }
                    }
                }
                throw new Error('No valid function call found in assistant response');
            }

            if (runStatus.status === 'requires_action') {
                const requiredAction = runStatus.required_action;
                if (requiredAction?.type === 'submit_tool_outputs') {
                    const toolOutputs = requiredAction.submit_tool_outputs.tool_calls.map(toolCall => ({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify({ success: true })
                    }));

                    await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
                        tool_outputs: toolOutputs
                    });
                    continue;
                }
            }

            if (runStatus.status === 'failed' ||
                runStatus.status === 'cancelled' ||
                runStatus.status === 'expired') {
                throw new Error(`Assistant run failed with status: ${runStatus.status}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } finally {
        // Clean up
        try {
            await openai.beta.threads.del(thread.id);
        } catch (error) {
            console.error('Failed to delete thread:', error);
        }
    }
}
