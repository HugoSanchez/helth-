import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/server/google'

export async function GET() {
    try {
        const url = getAuthUrl()
        return NextResponse.json({ url })
    } catch (error) {
        console.error('Failed to get auth URL:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
