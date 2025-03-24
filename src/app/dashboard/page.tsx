'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ConnectGmail } from '@/components/ConnectGmailButton'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Search, Upload } from 'lucide-react'
import { EmailClassification } from '@/types/gmail'
import { UploadDrawer } from '@/components/UploadDrawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isConnected, setIsConnected] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [isUploadOpen, setIsUploadOpen] = useState(false)
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
			setMessage({ type: 'info', text: 'Scanning emails for medical documents...' })

			const { data: { session } } = await supabase.auth.getSession()
			if (!session) {
				throw new Error('No session found')
			}

			// Step 1: Scan emails
			const scanResponse = await fetch('/api/gmail/scan', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				}
			})

			if (!scanResponse.ok) {
				throw new Error('Failed to scan emails')
			}

			const scanData = await scanResponse.json()
			const medicalEmails = scanData.results.filter((email: EmailClassification) =>
				email.classification.isMedical
			)

			if (medicalEmails.length === 0) {
				setMessage({ type: 'info', text: 'No medical documents found in scanned emails.' })
				return
			}

			// Step 2: Store medical documents
			setMessage({ type: 'info', text: `Found ${medicalEmails.length} medical emails. Storing documents...` })

			const storeResponse = await fetch('/api/gmail/store', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				},
				body: JSON.stringify({ emails: medicalEmails })
			})

			if (!storeResponse.ok) {
				throw new Error('Failed to store medical documents')
			}

			const storeData = await storeResponse.json()
			setMessage({
				type: 'success',
				text: `Successfully stored ${storeData.stored} medical documents. Failed: ${storeData.failed}`
			})

		} catch (err) {
			console.error('Scan error:', err)
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to process emails' })
		} finally {
			setIsScanning(false)
		}
	}

	return (
		<main className="container py-8 space-y-8">
			<div className="flex justify-between items-center pb-4">
				<h1 className="text-2xl font-bold"></h1>
			</div>
			<div className="flex items-center justify-center">
				<Card className="w-[600px]">
					<CardHeader>
						<CardTitle className='text-center'>Welcome to Helth.!</CardTitle>
						<CardDescription className='text-center'>This will be your Dashboard. Start by scanning your emails for medical documents or you can upload your first document. </CardDescription>
					</CardHeader>
					<CardContent>
						<div className="mt-4 mb-4">
							{!isConnected ? (
								<ConnectGmail />
							) : (
								<Button
									onClick={handleScan}
									disabled={isScanning}
									className="w-full h-12"
								>
									<Search className="mr-2 h-4 w-4" />
									{isScanning ? "Processing..." : "Scan Medical Documents"}
								</Button>
							)}
						</div>
						<p className="text-sm text-muted-foreground text-center">- or -</p>
						<Button
							className='w-full mt-2 hover:bg-white'
							onClick={() => setIsUploadOpen(true)}
							variant="ghost">
							<Upload className="mr-2 h-4 w-4" />
							Upload your first document
						</Button>
					</CardContent>
				</Card>
			</div>


			{message && (
				<StatusMessage type={message.type} text={message.text} />
			)}



			<UploadDrawer
				isOpen={isUploadOpen}
				onClose={() => setIsUploadOpen(false)}
			/>
		</main>
	)
}
