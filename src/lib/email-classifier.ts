import { pipeline } from '@xenova/transformers';

let classifier: any = null;

// Initialize the classifier (will be cached)
async function getClassifier() {
    if (!classifier) {
        // Use XLM-RoBERTa for multilingual support
        classifier = await pipeline('zero-shot-classification', 'Xenova/xlm-roberta-base');
    }
    return classifier;
}

export interface EmailContent {
    subject: string;
    body: string;
    from: string;
}

// Medical categories for classification
const MEDICAL_CATEGORIES = {
    general: [
        "medical information",
        "health records",
        "clinical documents",
        "healthcare communication"
    ],
    appointments: [
        "doctor appointment",
        "medical consultation",
        "health checkup",
        "medical procedure scheduling"
    ],
    results: [
        "test results",
        "lab report",
        "medical imaging",
        "diagnostic results"
    ],
    medications: [
        "prescription",
        "medication",
        "pharmacy",
        "drug information"
    ],
    insurance: [
        "health insurance",
        "medical billing",
        "healthcare coverage",
        "medical claims"
    ]
};

export async function classifyEmail(email: EmailContent): Promise<{
    isMedical: boolean;
    confidence: number;
    category?: string;
}> {
    const classifier = await getClassifier();

    // Combine subject and body for classification
    const text = `${email.subject}\n\n${email.body}`;

    // Prepare all categories for classification
    const allCategories = Object.values(MEDICAL_CATEGORIES).flat();

    try {
        // Use zero-shot classification to check against all medical categories
        const result = await classifier(text, {
            candidate_labels: allCategories,
            multi_label: true // Allow multiple categories to match
        });

        // Get the highest scoring category and its score
        const topScore = Math.max(...result.scores);
        const topCategory = result.labels[result.scores.indexOf(topScore)];

        // Determine the main category (general, appointments, etc.)
        let mainCategory = Object.keys(MEDICAL_CATEGORIES).find(key =>
            MEDICAL_CATEGORIES[key as keyof typeof MEDICAL_CATEGORIES].includes(topCategory)
        );

        // Consider it medical if the confidence is high enough
        const isMedical = topScore > 0.3; // Threshold can be adjusted

        return {
            isMedical,
            confidence: topScore,
            category: isMedical ? mainCategory : undefined
        };

    } catch (error) {
        console.error('Classification error:', error);
        // Fallback to basic keyword matching if model fails
        const hasKeywords = Object.values(MEDICAL_CATEGORIES)
            .flat()
            .some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));

        return {
            isMedical: hasKeywords,
            confidence: hasKeywords ? 0.5 : 0.1 // Lower confidence for keyword-only matching
        };
    }
}
