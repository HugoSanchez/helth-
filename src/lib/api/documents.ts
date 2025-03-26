import { HealthRecord } from "@/types/health"

export async function fetchUserDocuments(): Promise<HealthRecord[]> {
    const response = await fetch('/api/documents', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch documents')
    }

    return response.json()
}
