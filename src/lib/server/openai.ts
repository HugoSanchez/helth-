import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeDocument(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes medical documents."
        },
        {
          role: "user",
          content: `Please analyze this medical document and extract key information: ${content}`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw error;
  }
}

export async function screenEmailSubjects(subjects: string[]) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that screens email subjects for medical relevance."
        },
        {
          role: "user",
          content: `Please analyze these email subjects and determine if they are likely to contain medical information: ${subjects.join(', ')}`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error screening subjects:', error);
    throw error;
  }
}
