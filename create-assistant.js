const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	defaultHeaders: { "OpenAI-Beta": "assistants=v2" }
});

async function main() {
	try {
		console.log('Creating new document analyzer assistant...');
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
			instructions: `You are a medical document analyzer. Your primary task is to analyze medical documents and extract structured information using ONLY the processHealthRecord function.

				CRITICAL INSTRUCTIONS:
				1. You MUST use the processHealthRecord function to return your analysis
				2. DO NOT provide any text responses or explanations
				3. DO NOT analyze the document in free text form
				4. ALWAYS return your findings through the function call

				Analysis steps:
				1. Read the document using file_search
				2. Analyze the content
				3. Call processHealthRecord with these fields:
				   - record_type: (lab_report/prescription/imaging/clinical_notes/other)
				   - record_name: Clear, descriptive name
				   - summary: Key information summary
				   - doctor_name: Provider name if present
				   - date: YYYY-MM-DD format if present

				Example function call structure:
				processHealthRecord({
					record_type: "lab_report",
					record_name: "Complete Blood Count Results",
					summary: "Normal blood cell counts with slightly elevated white blood cells",
					doctor_name: "Dr. Smith",
					date: "2024-01-20"
				})`
		});

		console.log('\nAssistant created successfully!');
		console.log('Assistant ID:', assistant.id);
		console.log('\nAdd this ID to your .env.local file as OPENAI_ASSISTANT_ID');
	} catch (error) {
		console.error('Error creating assistant:', error);
		process.exit(1);
	}
}

main();
