import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Check if user is authenticated
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session) {
            console.error('Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch user's documents
        const { data: documents, error: documentsError } = await supabase
            .from('health_records')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (documentsError) {
            console.error('Error fetching documents:', documentsError)
            return NextResponse.json(
                { error: 'Failed to fetch documents' },
                { status: 500 }
            )
        }

        return NextResponse.json(documents)
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
