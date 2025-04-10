import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from '@/hooks/useTranslation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/client/utils'
import { useSearchParams, useRouter } from 'next/navigation'
import { ScanStep } from './ScanStep'
import type { Preferences } from '@/hooks/usePreferences'

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

export function ConnectStep({ onComplete, preferences }: ConnectStepProps) {
    const { t } = useTranslation(preferences?.language || 'en')
    const [isExpanded, setIsExpanded] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()
    const step = searchParams.get('step')
    const skipped = searchParams.get('skipped') === 'true'

    // If we're on step 3, show either scan or upload based on skip state
    if (step === '3') {
        if (skipped) {
            return (
                <>
                    <CardHeader>
                        <CardTitle className="text-4xl py-2 font-bold">{t('setup.upload.title')}</CardTitle>
                        <CardDescription className="text-lg font-light">
                            {t('setup.upload.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* TODO: Add your upload component here */}
                    </CardContent>
                </>
            )
        }
        return <ScanStep
            onComplete={onComplete}
            preferences={preferences}
            onSkip={() => {
                router.push('/settings?step=3&skipped=true')
            }}
        />
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
        router.push('/settings?step=3&skipped=true')
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

                    <div className="space-y-4">
                        <Button
                            className="w-full h-12 gap-4"
                            onClick={handleConnect}
                        >
                            <GoogleLogo />
                            {t('setup.connect.connectButton')}
                        </Button>
                    </div>

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
