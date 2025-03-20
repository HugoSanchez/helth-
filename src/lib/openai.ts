import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

export async function analyzeDocument(fileId: string, filename: string): Promise<HealthRecord> {
    const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
            {
                role: "system",
                content: "You are a medical document analyzer. Extract key information from medical documents and format it according to the specified schema."
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Analyze this medical document named "${filename}" and extract key information.`
                    },
                    {
                        type: "file_path",
                        file_path: fileId,
                    }
                ]
            }
        ],
        functions: [
            {
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
        ],
        function_call: { name: "processHealthRecord" }
    })

    if (!response.choices[0].message.function_call) {
        throw new Error('Expected function call in response')
    }

    const result = JSON.parse(response.choices[0].message.function_call.arguments)
    return result
}
