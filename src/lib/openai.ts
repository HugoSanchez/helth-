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

export async function analyzeEmailContent(email: EmailContent): Promise<AnalyzedEmail> {
    // Step 1: Initial email screening
    const screeningPrompt = `Analyze this email and determine if it contains medical information. The email details are:

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
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are a medical document analyzer. Your task is to identify emails containing medical information and extract relevant details."
            },
            {
                role: "user",
                content: screeningPrompt
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

export async function analyzeDocument(content: string, filename: string): Promise<DocumentAnalysis> {
    const prompt = `Analyze this medical document and extract key information. The document is named "${filename}" and contains:

		${content}

		Provide your analysis in the following JSON format:
		{
			"type": "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other",
			"summary": "brief overview of the document",
			"keyFindings": ["list", "of", "important", "findings"],
			"dates": {
				"documentDate": "date of document if present",
				"testDate": "date of tests/procedures if present",
				"followUpDate": "recommended follow-up date if present"
			},
			"provider": {
				"name": "provider name if present",
				"facility": "facility name if present"
			},
			"measurements": {
				"measurement_name": {
					"value": "measured value",
					"unit": "unit of measurement",
					"normalRange": "normal range if provided",
					"isAbnormal": boolean
				}
			}
		}`;

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are a medical document analyzer specializing in extracting structured information from medical documents."
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

    return JSON.parse(response.choices[0].message.content) as DocumentAnalysis;
}
