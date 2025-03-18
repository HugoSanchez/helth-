'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ConnectGmail } from '@/components/connect-gmail'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isLoading, setIsLoading] = useState(true)
	const [isScanning, setIsScanning] = useState(false)
	const [scanProgress, setScanProgress] = useState<{
		processed: number;
		medical: number;
		done: boolean;
	}>({ processed: 0, medical: 0, done: false })
	const [hasGmailConnection, setHasGmailConnection] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

	useEffect(() => {
		const success = searchParams.get('success')
		const error = searchParams.get('error')

		if (success === 'gmail_connected') {
			setMessage({
				type: 'success',
				text: 'Gmail account successfully connected! We will start scanning for health records.'
			})
		} else if (error === 'gmail_auth_failed') {
			setMessage({
				type: 'error',
				text: 'Failed to connect Gmail account. Please try again.'
			})
		}
	}, [searchParams])

	useEffect(() => {
		const checkSession = async () => {
			try {
				const { data: { session } } = await supabase.auth.getSession()
				if (!session) {
					router.replace('/login')
					return
				}

				// Check if user has Gmail connection
				const { data: account } = await supabase
					.from('gmail_accounts')
					.select('*')
					.eq('user_id', session.user.id)
					.single()

				setHasGmailConnection(!!account)
			} catch (error) {
				console.error('Error checking session:', error)
				router.replace('/login')
			} finally {
				setIsLoading(false)
			}
		}

		checkSession()
	}, [router])

	const handleScan = async () => {
		try {
			setIsScanning(true)
			setScanProgress({ processed: 0, medical: 0, done: false })
			setMessage({
				type: 'info',
				text: 'Scanning your last 50 emails...'
			})

			// Get the current session
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) {
				throw new Error('No session found')
			}

			// Scan emails
			const response = await fetch('/api/gmail/scan', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				},
				body: JSON.stringify({})
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Failed to scan emails')
			}

			// Update progress with final results
			setScanProgress({
				processed: data.messages.length,
				medical: data.count,
				done: true
			})

			// Scanning complete
			setMessage({
				type: 'success',
				text: `Scan complete! Found ${data.count} medical emails out of ${data.messages.length} processed.`
			})
		} catch (error) {
			console.error('Scan error:', error)
			setMessage({
				type: 'error',
				text: 'Failed to scan emails. Please try again.'
			})
		} finally {
			setIsScanning(false)
		}
	}

	if (isLoading) {
		return <div>Loading...</div>
	}

	return (
		<div className="space-y-8">
			{message && (
				<div className={`rounded-lg px-4 py-3 ${
					message.type === 'success' ? 'bg-teal-400 text-white' :
					message.type === 'error' ? 'bg-transparent text-red-600 border border-red-600' :
					'bg-blue-100 text-blue-800 border border-blue-300'
				}`}>
					<div className="flex items-center gap-2">
						{message.type === 'success' ? (
							<CheckCircle2 className="h-5 w-5 flex-shrink-0" />
						) : message.type === 'error' ? (
							<AlertCircle className="h-5 w-5 flex-shrink-0" />
						) : (
							<Search className="h-5 w-5 flex-shrink-0" />
						)}
						<p className="text-sm">{message.text}</p>
					</div>
				</div>
			)}

			{isScanning && !scanProgress.done && (
				<div className="text-sm text-gray-600">
					Processed {scanProgress.processed} emails, found {scanProgress.medical} medical records...
				</div>
			)}

			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Your Health Records</h2>
				{!hasGmailConnection ? (
					<ConnectGmail />
				) : (
					<Button
						onClick={() => handleScan()}
						disabled={isScanning}
						className="flex items-center gap-2"
					>
						<Search className="h-4 w-4" />
						{isScanning ? 'Scanning...' : 'Scan Documents'}
					</Button>
				)}
			</div>
			<p className="text-gray-600">
				{hasGmailConnection
					? "Your Gmail account is connected. Click 'Scan Documents' to search for health records in your last 50 emails."
					: "Connect your Gmail account to start scanning for health records."}
			</p>
		</div>
	)
}
