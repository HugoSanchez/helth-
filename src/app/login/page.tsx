'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from 'next/navigation'

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [isCheckingSession, setIsCheckingSession] = useState(true)

	useEffect(() => {
		const checkSession = async () => {
			try {
				const { data: { session } } = await supabase.auth.getSession()
				if (session) router.replace('/dashboard')
			} catch (error) {
				console.error('Session check error:', error)
			} finally {
				setIsCheckingSession(false)
			}
		}

		checkSession()

		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (session) {
				router.replace('/dashboard')
			}
		})

		return () => {
			subscription.unsubscribe()
		}
	}, [router])

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			setLoading(true)
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`,
				},
			})

			if (error) throw error
			setMessage('Check your email for the login link!')
		} catch (error) {
			setMessage('Error sending magic link')
		} finally {
			setLoading(false)
		}
	}

	if (isCheckingSession) {
		return <div>Loading...</div>
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
		<Card className="w-[350px]">
			<CardHeader>
			<CardTitle>Welcome to Health Records</CardTitle>
			<CardDescription>
				Sign in via magic link with your email below
			</CardDescription>
			</CardHeader>
			<CardContent>
			<form onSubmit={handleLogin} className="space-y-4">
				<Input
				type="email"
				placeholder="Your email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
				/>
				<Button
				type="submit"
				className="w-full"
				disabled={loading}
				>
				{loading ? 'Sending magic link...' : 'Send magic link'}
				</Button>
				{message && (
				<p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
					{message}
				</p>
				)}
			</form>
			</CardContent>
		</Card>
		</div>
	)
}
