'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/server/supabase'

export async function login(email: string) {
	const supabase = await createSupabaseServerClient()
	const baseUrl = process.env.BASE_URL

	const data = {
		email,
		options: {
			emailRedirectTo: `${baseUrl}/auth/callback`,
		}
	}

	const { error } = await supabase.auth.signInWithOtp(data)

	if (error) {
		redirect('/error')
	}

	revalidatePath('/', 'layout')
	redirect('/dashboard')
}
