'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePreferences } from '@/hooks/usePreferences'
import { DocumentsTable } from '@/components/DocumentsTable'
import { HealthRecord } from '@/types/health'
import { Upload } from 'lucide-react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from '@/components/ui/avatar'
import { fetchUserDocuments, APIError } from '@/lib/api/documents'

export default function DashboardPage() {
	const router = useRouter()
	const supabase = createClientComponentClient()
	const { preferences, loading: prefsLoading, error: prefsError } = usePreferences()
	const [documents, setDocuments] = useState<HealthRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Check authentication
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const { data: { user } } = await supabase.auth.getUser()
				if (!user) {
					router.replace('/login')
				}
			} catch (error) {
				console.error('Auth check error:', error)
				router.replace('/login')
			}
		}

		checkAuth()
	}, [router, supabase])

	// Fetch documents
	useEffect(() => {
		let mounted = true

		const fetchDocuments = async () => {
			try {
				const data = await fetchUserDocuments()
				if (mounted) {
					setDocuments(data)
				}
			} catch (err) {
				console.error('Error fetching documents:', err)
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

		fetchDocuments()

		return () => {
			mounted = false
		}
	}, [router])

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

	return (
		<main className="py-12 md:px-16">
			<div className="flex items-center justify-between pb-4">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold">
						Welcome, {preferences?.display_name || 'User'}
					</h1>
					<h1 className="text-2xl font-light">
						This is your dashboard
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
					<DocumentsTable documents={documents} />
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
