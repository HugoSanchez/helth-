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
			setMessage('Check your email!')
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
		<div className="min-h-screen flex justify-center">
			<div className="mt-16 md:mt-28">
			<Card className="w-[450px] py-4">
				<CardHeader className="text-center">
				<CardTitle className="text-3xl">Welcome, please log in.</CardTitle>
				<CardDescription className="font-light text-lg">
					Type your email below to get a magic link
				</CardDescription>
				</CardHeader>
				<CardContent>
				<form onSubmit={handleLogin} className="space-y-4">
					<Input
						type="email"
						className="h-12 text-md bg-white"
						placeholder="Your email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<Button
						type="submit"
						className="w-full h-12 text-md"
						disabled={loading}
					>
					{loading ? 'Sending magic link...' : 'Get magic link'}
					</Button>
					{message && (
					<p className={`text-md font-regular text-center ${message.includes('Error') ? 'text-red-500' : 'text-teal-500'}`}>
						{message}
					</p>
					)}
				</form>
				</CardContent>
			</Card>
			</div>

		</div>
	)
}
