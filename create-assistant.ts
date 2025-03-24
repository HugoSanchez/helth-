const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function createAssistant() {
	try {
		const assistant = await openai.beta.assistants.create({
		name: "Document Analyzer",
		instructions: "You are a medical document analyzer. You help analyze medical documents and extract relevant information.",
		model: "gpt-4o-mini",
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

		console.log('Assistant created successfully!');
		console.log('Assistant ID:', assistant.id);
	} catch (error) {
		console.error('Error creating assistant');
	}
}

createAssistant();
