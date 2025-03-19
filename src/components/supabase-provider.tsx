'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
	const supabase = createClientComponentClient()
	const router = useRouter()

	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
		if (!session && event === 'SIGNED_OUT') {
				router.replace('/login')
			}
		})

		return () => {
			subscription.unsubscribe()
		}
	}, [router, supabase])

	return children
}
