import { HealthRecord } from "@/types/health"

export class APIError extends Error {
    constructor(
        message: string,
        public status: number,
        public isAuthError: boolean = false
    ) {
        super(message)
        this.name = 'APIError'
    }
}

export async function fetchUserDocuments(): Promise<HealthRecord[]> {
    const response = await fetch('/api/documents', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const data = await response.json()

    if (!response.ok) {
        throw new APIError(
            data.error || 'Failed to fetch documents',
            response.status,
            response.status === 401
        )
    }

    return data
}

export async function analyzeDocument(file: File): Promise<{ success: boolean; error?: string; data?: any }> {
    const formData = new FormData()
    formData.append('file', file)

    try {
        const response = await fetch('/api/documents/analyze', {
            method: 'POST',
            body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
            if (response.status === 422 && data.errorType === 'not_medical_document') {
                return { success: false, error: 'Invalid document type' }
            }
            return {
                success: false,
                error: data.error || 'Failed to analyze document'
            }
        }

        return {
            success: true,
            data
        }
    } catch (error) {
        // Handle network errors or other unexpected errors
        return {
            success: false,
            error: 'Failed to analyze document'
        }
    }
}

export async function deleteDocuments(recordIds: string[]): Promise<void> {
    const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordIds }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new APIError(
            data.error || 'Failed to delete documents',
            response.status,
            response.status === 401
        );
    }

    return data;
}

export async function updateDocument(id: string, updates: Partial<HealthRecord>): Promise<HealthRecord> {
    const response = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new APIError(
            data.error || 'Failed to update document',
            response.status,
            response.status === 401
        );
    }

    return data;
}
