'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConnectGmail } from '@/components/ConnectGmailButton'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Search, Upload } from 'lucide-react'
import { EmailClassification } from '@/types/gmail'
import { UploadDrawer } from '@/components/UploadDrawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/hooks/useSession'
import { hasGmailConnection } from '@/lib/client/auth'
import { usePreferences } from '@/hooks/usePreferences'
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'

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

	// Update language when preferences change
	useEffect(() => {
		if (preferences?.language) {
			console.log('Setting language to:', preferences.language)
			setCurrentLanguage(preferences.language)
		}
	}, [preferences])

	// Show loading state while checking session or loading preferences
	if (sessionLoading || prefsLoading) {
		return (
			<main className="container flex items-center justify-center min-h-screen">
				<p>{t('common.loading')}</p>
			</main>
		)
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
		</main>
	)
}
