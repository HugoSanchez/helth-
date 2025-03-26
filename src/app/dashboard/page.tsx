'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConnectGmail } from '@/components/ConnectGmailButton'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { EmailClassification } from '@/types/gmail'
import { UploadDrawer } from '@/components/UploadDrawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/hooks/useSession'
import { hasGmailConnection } from '@/lib/client/auth'
import { usePreferences } from '@/hooks/usePreferences'
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { DocumentsTable } from '@/components/DocumentsTable'
import Link from "next/link"
import {
	Activity,
	ArrowUpRight,
	CircleUser,
	CreditCard,
	DollarSign,
	Search,
	Users,
	Upload,
	CopyIcon
} from "lucide-react"

import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from '@/components/ui/avatar'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

import { fetchUserDocuments } from "@/lib/api/documents"
import { HealthRecord } from "@/types/health"

export default function DashboardPage() {
	const searchParams = useSearchParams()
	const { session, loading: sessionLoading } = useSession({ redirectTo: '/login', requireOnboarding: true })
	const { preferences, loading: prefsLoading } = usePreferences()
	const [currentLanguage, setCurrentLanguage] = useState<Language>('en')
	const { t } = useTranslation(currentLanguage)
	const [isConnected, setIsConnected] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [isUploadOpen, setIsUploadOpen] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
	const [documents, setDocuments] = useState<HealthRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Update language when preferences change
	useEffect(() => {
		if (preferences?.language) {
			console.log('Setting language to:', preferences.language)
			setCurrentLanguage(preferences.language)
		}
	}, [preferences])

	useEffect(() => {
		async function loadDocuments() {
			try {
				const docs = await fetchUserDocuments()
				setDocuments(docs)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load documents')
			} finally {
				setIsLoading(false)
			}
		}

		loadDocuments()
	}, [])

	// Show loading state while checking session or loading preferences
	if (sessionLoading || prefsLoading) {
		return (
			<main className="container flex items-center justify-center min-h-screen">
				<p>{t('common.loading')}</p>
			</main>
		)
	}

	if (isLoading) {
		return <div>Loading...</div>
	}

	if (error) {
		return <div>Error: {error}</div>
	}

	return (
		<main className="py-12 md:px-16">
			<div className="flex items-center justify-between pb-4">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold">
						{t('dashboard.greeting').replace('{name}', preferences?.displayName || '')}
					</h1>
					<h1 className="text-2xl font-light">
						{t('dashboard.thisIsYourDashboard')}
					</h1>
				</div>
				<div>
					<Button>
						<Upload />
						{t('dashboard.uploadButton')}
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
