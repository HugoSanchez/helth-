'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePreferences } from '@/hooks/usePreferences'
import { DocumentsTable } from '@/components/DocumentsTable'
import { useTranslation } from '@/hooks/useTranslation'
import { HealthRecord } from '@/types/health'
import { Upload } from 'lucide-react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from '@/components/ui/avatar'
import { fetchUserDocuments, analyzeDocument, APIError } from '@/lib/api/documents'

// Let's verify the analyzeDocument function
console.log('analyzeDocument function available:', !!analyzeDocument)

export default function DashboardPage() {
	const router = useRouter()
	const supabase = createClientComponentClient()
	const { preferences, loading: prefsLoading, error: prefsError } = usePreferences()
	const { t } = useTranslation(preferences?.language || 'en')
	const [documents, setDocuments] = useState<HealthRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)


	// Check authentication and fetch documents
	useEffect(() => {
		let mounted = true

		const initializeDashboard = async () => {
			try {
				// Check auth first
				const { data: { user } } = await supabase.auth.getUser()
				if (!user) {
					router.replace('/login')
					return
				}

				// Then fetch documents
				const data = await fetchUserDocuments()
				if (mounted) {
					setDocuments(data)
				}
			} catch (err) {
				console.error('Dashboard initialization error:', err)
				if (mounted) {
					if (err instanceof APIError && err.isAuthError) {
						router.replace('/login')
					} else {
						setError(err instanceof Error ? err.message : 'Failed to fetch documents')
					}
				}
			} finally {
				if (mounted) {
					setIsLoading(false)
				}
			}
		}

		initializeDashboard()

		return () => {
			mounted = false
		}
	}, [router, supabase])

	const handleFileSelect = async (file: File) => {
		console.log('handleFileSelect called with file:', {
			name: file.name,
			type: file.type,
			size: file.size
		})

		try {
			setIsLoading(true)
			console.log('Starting document analysis for:', file.name)

			console.log('Calling analyzeDocument...')
			const result = await analyzeDocument(file)
			console.log('Analysis response:', result)

			console.log('Fetching updated documents list...')
			const newDocs = await fetchUserDocuments()
			console.log('New documents:', newDocs)

			setDocuments(newDocs)
		} catch (err) {
			console.error('Error details:', {
				name: err instanceof Error ? err.name : 'Unknown',
				message: err instanceof Error ? err.message : 'Unknown error',
				error: err
			})
			setError(err instanceof Error ? err.message : 'Failed to upload document')
		} finally {
			setIsLoading(false)
		}
	}

	if (prefsLoading || isLoading) {
		return (
			<main className="flex items-center justify-center min-h-screen">
				<p>Loading...</p>
			</main>
		)
	}

	if (prefsError || error) {
		return (
			<main className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Error</h2>
					<p className="text-red-500">{prefsError || error}</p>
				</div>
			</main>
		)
	}

	// Log if no documents are found
	if (documents.length === 0) {
		console.log('No documents found for user')
	}

	return (
		<main className="py-12 md:px-16">
			<div className="flex items-center justify-between pb-4">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold">
						{t('dashboard.greeting').replace('{name}', preferences?.display_name || '')}
					</h1>
					<h1 className="text-2xl font-light">
						 this is your Dashboard.
					</h1>
				</div>
				<div>
					<Button>
						<Upload className="mr-2 h-4 w-4" />
						Upload Document
					</Button>
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-4 p-4 mt-6 md:gap-8 border border-border">
				<div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
					<DocumentsTable
						documents={documents}
						onFileSelect={handleFileSelect}
					/>
					<Card>
						<CardHeader>
							<CardTitle>Doctors list</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-8">
							<div className="flex items-center gap-4">
								<Avatar className="hidden h-9 w-9 sm:flex">
									<AvatarImage src="" alt="Avatar" />
									<AvatarFallback>OM</AvatarFallback>
								</Avatar>
								<div className="grid gap-1">
									<p className="text-sm font-medium leading-none">
										Olivia Martin
									</p>
									<p className="text-sm text-muted-foreground">
										olivia.martin@email.com
									</p>
								</div>
								<div className="ml-auto font-medium">+$1,999.00</div>
							</div>
							<div className="flex items-center gap-4">
								<Avatar className="hidden h-9 w-9 sm:flex">
									<AvatarImage src="" alt="Avatar" />
									<AvatarFallback>JL</AvatarFallback>
								</Avatar>
								<div className="grid gap-1">
									<p className="text-sm font-medium leading-none">
										Jackson Lee
									</p>
									<p className="text-sm text-muted-foreground">
										jackson.lee@email.com
									</p>
								</div>
								<div className="ml-auto font-medium">+$39.00</div>
							</div>
							<div className="flex items-center gap-4">
								<Avatar className="hidden h-9 w-9 sm:flex">
									<AvatarImage src="" alt="Avatar" />
									<AvatarFallback>IN</AvatarFallback>
								</Avatar>
								<div className="grid gap-1">
									<p className="text-sm font-medium leading-none">
										Isabella Nguyen
									</p>
									<p className="text-sm text-muted-foreground">
										isabella.nguyen@email.com
									</p>
								</div>
								<div className="ml-auto font-medium">+$299.00</div>
							</div>
							<div className="flex items-center gap-4">
								<Avatar className="hidden h-9 w-9 sm:flex">
									<AvatarImage src="" alt="Avatar" />
									<AvatarFallback>WK</AvatarFallback>
								</Avatar>
								<div className="grid gap-1">
									<p className="text-sm font-medium leading-none">
										William Kim
									</p>
									<p className="text-sm text-muted-foreground">
										will@email.com
									</p>
								</div>
								<div className="ml-auto font-medium">+$99.00</div>
							</div>
							<div className="flex items-center gap-4">
								<Avatar className="hidden h-9 w-9 sm:flex">
									<AvatarImage src="" alt="Avatar" />
									<AvatarFallback>SD</AvatarFallback>
								</Avatar>
								<div className="grid gap-1">
									<p className="text-sm font-medium leading-none">
										Sofia Davis
									</p>
									<p className="text-sm text-muted-foreground">
										sofia.davis@email.com
									</p>
								</div>
								<div className="ml-auto font-medium">+$39.00</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	)
}
