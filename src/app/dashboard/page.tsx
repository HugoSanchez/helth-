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
	const [hasGmailConnection, setHasGmailConnection] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
			console.log('1. Starting scan request');

			// Get the current session
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) {
				throw new Error('No session found')
			}

			// Use Supabase's fetch method with auth headers
			const response = await fetch('/api/gmail/scan', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				}
			})

			console.log('2. Scan response status:', response.status);
			const data = await response.json();
			console.log('3. Scan response data:', data);

			if (!response.ok) {
				throw new Error(`Failed to scan emails: ${data.error || 'Unknown error'}`);
			}

			setMessage({
				type: 'success',
				text: `Successfully scanned ${data.count} emails`
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
					message.type === 'success'
						? 'bg-teal-400 text-white'
						: 'bg-transparent text-red-600 border border-red-600'
				}`}>
					<div className="flex items-center gap-2">
						{message.type === 'success' ? (
							<CheckCircle2 className="h-5 w-5 flex-shrink-0" />
						) : (
							<AlertCircle className="h-5 w-5 flex-shrink-0" />
						)}
						<p className="text-sm">{message.text}</p>
					</div>
				</div>
			)}
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Your Health Records</h2>
				{!hasGmailConnection ? (
					<ConnectGmail />
				) : (
					<Button
						onClick={handleScan}
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
					? "Your Gmail account is connected. Click 'Scan Documents' to search for health records."
					: "Connect your Gmail account to start scanning for health records."}
			</p>
		</div>
	)
}
