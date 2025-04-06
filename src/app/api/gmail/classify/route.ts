import { NextResponse } from 'next/server';
// import { pipeline } from '@xenova/transformers';

// @ts-ignore - Ignore type issues with the transformers library
/**
let classifier: any = null;

async function getClassifier(): Promise<any> {
  if (!classifier) {
    // Use multilingual model instead
    classifier = await pipeline('zero-shot-classification', 'Xenova/mbert-base-multilingual-uncased-mnli');
  }
  return classifier;
}
*/

export async function POST(request: Request) {
	console.log('CLASSIFY ROUTE');
	return NextResponse.json({ message: 'Classify route called' }, { status: 200 });
	/**
	try {

		const { text } = await request.json();
		console.log('TEXT:', text);

		if (!text || typeof text !== 'string') {
			return NextResponse.json({ error: 'Valid text is required' }, { status: 400 });
		}

		const startTime = performance.now();

		// Get the model
		const model = await getClassifier();

		// Define the categories we want to classify against
		const candidate_labels = ['medical', 'healthcare', 'non-medical'];

		// Run classification
		const result = await model(text, {
		candidate_labels,
		multi_label: false, // We want a single classification
		});

		// Get the top result
		const topLabel = result.labels[0];
		const topScore = result.scores[0];

		// Determine if medical-related
		const isMedical = topLabel === 'medical' || topLabel === 'healthcare';

		const endTime = performance.now();

		return NextResponse.json({
			isMedical,
			confidence: topScore,
			classificationDetails: {
				topLabel,
				score: topScore,
				allLabels: result.labels,
				allScores: result.scores
			},
			processingTime: Math.round(endTime - startTime),
			method: 'transformers-zero-shot'
		});

	} catch (error) {
		console.error('Classification error:', error);
		return NextResponse.json({
			error: 'Failed to classify text',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
	*/
}
