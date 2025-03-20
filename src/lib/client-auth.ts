import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Frontend utility to make authenticated fetch requests
 * Automatically handles auth headers and error responses
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
) {
    try {
        const supabase = createClientComponentClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            throw new Error('No session found')
        }

        // Don't set Content-Type for FormData, let the browser handle it
        const headers: HeadersInit = {
            ...options.headers,
            'Authorization': session.access_token,
            ...(!(options.body instanceof FormData) && {
                'Content-Type': 'application/json'
            })
        }

        const response = await fetch(url, {
            ...options,
            headers
        })

        if (response.status === 401) {
            throw new Error('Unauthorized')
        }

        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`)
        }

        return response
    } catch (error) {
        console.error('Request error:', error)
        throw error
    }
}
