import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { hasCompletedOnboarding } from '@/lib/client/auth'

interface UseSessionOptions {
  redirectTo?: string
  requireOnboarding?: boolean
}

export function useSession({ redirectTo, requireOnboarding = false }: UseSessionOptions = {}) {
	const router = useRouter()
	const [session, setSession] = useState<any>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function checkSession() {
		try {
			// Get session
			const { data: { session: currentSession } } = await supabase.auth.getSession()

			if (!currentSession && redirectTo) {
			router.push(redirectTo)
			return
			}

			if (currentSession && requireOnboarding) {
			// Check if user has completed onboarding
			const hasOnboarding = await hasCompletedOnboarding(currentSession.user.id)
			if (!hasOnboarding) {
				router.push('/setup')
				return
			}
			}

			setSession(currentSession)
		} catch (error) {
			console.error('Session check error:', error)
			if (redirectTo) {
			router.push(redirectTo)
			}
		} finally {
			setLoading(false)
		}
		}

		checkSession()

		// Listen for auth state changes
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
		setSession(session)
		})

		return () => {
		subscription.unsubscribe()
		}
	}, [redirectTo, requireOnboarding, router])

	return { session, loading }
}
