'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ConnectGmail } from '@/components/connect-gmail'
import { StatusMessage } from '@/components/status-message'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export default function DashboardPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isConnected, setIsConnected] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

	// Check connection status on mount and when URL params change
	useEffect(() => {
		checkConnection()

		// Check URL params for connection status
		const success = searchParams.get('success')
		if (success === 'gmail_connected') {
			setMessage({ type: 'success', text: 'Gmail connected successfully!' })
		}
	}, [searchParams])

	async function checkConnection() {
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) {
				router.replace('/login')
				return
			}

			const { data } = await supabase
				.from('gmail_accounts')
				.select('id')
				.eq('user_id', session.user.id)
				.maybeSingle()

			setIsConnected(!!data)
		} catch (err) {
			console.error('Error checking connection:', err)
			setMessage({ type: 'error', text: 'Failed to check connection status' })
		}
	}

	async function handleScan() {
		try {
			setIsScanning(true)
			setMessage(null)

			const { data: { session } } = await supabase.auth.getSession()
			if (!session) {
				throw new Error('No session found')
			}

			const response = await fetch('/api/gmail/scan', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				}
			})

			if (!response.ok) {
				throw new Error('Failed to scan emails')
			}

			const data = await response.json()
			setMessage({
				type: 'success',
				text: `Scan complete! Found ${data.count} medical emails.`
			})

		} catch (err) {
			console.error('Scan error:', err)
			setMessage({ type: 'error', text: 'Failed to scan emails' })
		} finally {
			setIsScanning(false)
		}
	}

	return (
		<main className="container max-w-4xl py-8 space-y-8">
			<h1 className="text-2xl font-bold">Dashboard</h1>

			{message && (
				<StatusMessage type={message.type} text={message.text} />
			)}

			<div className="space-y-4">
				{!isConnected ? (
					<ConnectGmail />
				) : (
					<Button
						onClick={handleScan}
						disabled={isScanning}
						className="w-full sm:w-auto"
					>
						<Search className="mr-2 h-4 w-4" />
						{isScanning ? "Scanning..." : "Scan Emails"}
					</Button>
				)}
			</div>
		</main>
	)
}
