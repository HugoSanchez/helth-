import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Use getUser() instead of getSession() for better security
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[Update] Auth error:', authError)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const updates = await request.json()

        // Update the record
        const { data: record, error: updateError } = await supabase
            .from('health_records')
            .update({
                display_name: updates.display_name,
                record_type: updates.record_type,
                doctor_name: updates.doctor_name,
                date: updates.date,
                updated_at: new Date().toISOString()
            })
            .eq('id', params.id)
            .eq('user_id', user.id) // Ensure user owns the record
            .select()
            .single()

        if (updateError) {
            console.error('[Update] Database error:', updateError)
            return NextResponse.json(
                { error: 'Failed to update record' },
                { status: 500 }
            )
        }

        return NextResponse.json(record)
    } catch (error) {
        console.error('[Update] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
