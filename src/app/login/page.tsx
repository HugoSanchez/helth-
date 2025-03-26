'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
	const supabase = createClientComponentClient()

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setMessage(null)

		try {
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/callback`,
				},
			})

			if (error) throw error

			setMessage({
				type: 'success',
				text: 'Check your email for the login link!'
			})
		} catch (error) {
			setMessage({
				type: 'error',
				text: error instanceof Error ? error.message : 'Failed to send login link'
			})
		} finally {
			setLoading(false)
		}
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
								<p className={`text-md font-regular text-center ${
									message.type === 'error' ? 'text-red-500' : 'text-teal-500'
								}`}>
									{message.text}
								</p>
							)}
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
