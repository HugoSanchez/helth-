import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from '@/hooks/useTranslation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/client/utils'
import type { Preferences } from '@/hooks/usePreferences'
import { ScanProgress } from './ScanProgress'
import { useSearchParams, useRouter } from 'next/navigation'

function GoogleLogo() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    )
}

/**
 * 	Scan Response Object {
* 		success: true / false,
		complete: true / false,
		stats,
		nextPageToken,
		sessionId
	}
 */
interface ConnectStepProps {
    onComplete: () => void
    preferences: Preferences | null
}

interface ScanStatus {
    status: 'idle' | 'processing' | 'completed';
	error: string | null;
    processed_emails: number;
    total_documents: number;
	nextPageToken: string | null;
	sessionId: string | null;
}

export function ConnectStep({ onComplete, preferences }: ConnectStepProps) {
    const { t } = useTranslation(preferences?.language || 'en')
    const [isExpanded, setIsExpanded] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<ScanStatus>({
        status: 'idle',
        processed_emails: 0,
        total_documents: 0,
		nextPageToken: null,
		sessionId: null,
		error: null
    })
    const [error, setError] = useState<string | null>(null)

    const handleScan = async () => {
        if (!status.sessionId &&
			!status.nextPageToken &&
			!status.error &&
			status.status == 'completed'){
			await triggerScan(null, null)
		} else if (status.status == 'completed'){
			onComplete()
		} else {
			await triggerScan(status.nextPageToken, status.sessionId)
		}
    };

    // Initialize scan if needed
    if (searchParams.get('scan') === 'true' && !isScanning && status.status !== 'completed') {
        setIsScanning(true)
        handleScan()
        // Remove the scan parameter to prevent re-triggering
        router.replace('?')
    }

	const triggerScan = async (nextPageToken: string | null, sessionId: string | null) => {
		let requestObject = {}
		if (nextPageToken && sessionId) requestObject = {nextPageToken, sessionId}

		try {
			// Initialize scan session
            const scanResponse = await fetch('/api/gmail/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestObject)  // Empty body for initial request
            });

            if (!scanResponse.ok) {
                throw new Error('Failed to start scan');
            }

            const sessionData = await scanResponse.json();
			console.log('sessionData', sessionData)

            // Update status with initial stats
            setStatus({
                status: sessionData.complete || !sessionData.nextPageToken ? 'completed' : 'processing',
                processed_emails: sessionData.stats.processed,
                total_documents: sessionData.stats.documents,
				nextPageToken: sessionData.nextPageToken || null,
				sessionId: sessionData.sessionId || null,
				error: sessionData.success ? null : 'Failed to scan emails'
            });

			return sessionData

		} catch (error) {
			console.error('Error scanning emails:', error);
			setError(error instanceof Error ? error.message : 'Failed to scan emails');
			setIsScanning(false);
			return null
		}

	}

    const handleConnect = async () => {
		const params = new URLSearchParams({
			client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
			redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
			response_type: 'code',
			scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
			access_type: 'offline',
			prompt: 'consent'
		});

		window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    const handleSkip = () => {
        onComplete()
    }

    if (isScanning) {
        return <ScanProgress
            language={preferences?.language || 'en'}
            status={status}
            error={error}
        />;
    }

    return (
        <>
            <CardHeader>
                <CardTitle className="text-4xl py-2 font-bold">{t('setup.connect.title')}</CardTitle>
                <CardDescription className="text-lg font-light">
                    {t('setup.connect.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="border-b pb-4">
                        <button
                            className="text-sm flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <ChevronRight
                                className={cn(
                                    "h-4 w-4 transition-transform duration-200",
                                    isExpanded && "rotate-90"
                                )}
                            />
                            {t('setup.connect.whyConnect')}
                        </button>

                        {isExpanded && (
                            <div className="mt-4 pl-6 space-y-4">
                                <p className="font-medium">{t('setup.connect.benefits.title')}</p>
                                <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                                    {t('setup.connect.benefits.items').map((item: string, index: number) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full h-12 gap-4"
                        onClick={handleConnect}
                        disabled={isScanning}
                    >
                        <GoogleLogo />
                        {isScanning ? t('setup.connect.starting') : t('dashboard.scanButton')}
                    </Button>

                    <div>
                        <Button
                            variant="link"
                            onClick={handleSkip}
                            className="w-full font-serif font-light justify-start p-0"
                        >
                            {t('common.skip')}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </>
    )
}
