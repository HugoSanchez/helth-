import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from '@/hooks/useTranslation'
import { Search } from 'lucide-react'
import type { Preferences } from '@/hooks/usePreferences'
import { ScanProgress } from './ScanProgress'

interface ScanStepProps {
    onComplete: () => void
    preferences: Preferences | null
    onSkip: () => void
}

interface ScanStatus {
    status: 'idle' | 'processing' | 'completed';
    error: string | null;
    processed_emails: number;
    total_documents: number;
    nextPageToken: string | null;
    sessionId: string | null;
}

export function ScanStep({ onComplete, preferences, onSkip }: ScanStepProps) {
    const { t } = useTranslation(preferences?.language || 'en')
    const [isScanning, setIsScanning] = useState(false)
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
        setIsScanning(true)
        try {
            if (!status.sessionId &&
                !status.nextPageToken &&
                !status.error &&
                status.status == 'completed') {
                await triggerScan(null, null)
            } else if (status.status == 'completed') {
                onComplete()
            } else {
                await triggerScan(status.nextPageToken, status.sessionId)
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to scan emails')
            setIsScanning(false)
        }
    }

    const triggerScan = async (nextPageToken: string | null, sessionId: string | null) => {
        let requestObject = {}
        if (nextPageToken && sessionId) requestObject = { nextPageToken, sessionId }

        try {
            const scanResponse = await fetch('/api/gmail/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestObject)
            });

            if (!scanResponse.ok) {
                throw new Error('Failed to start scan');
            }

            const sessionData = await scanResponse.json();
            console.log('sessionData', sessionData)

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

    const handleSkip = () => {
        onSkip()
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
                <CardTitle className="text-4xl py-2 font-bold">
                    {t('setup.scan.title')}
                </CardTitle>
                <CardDescription className="text-lg font-light">
                    {t('setup.scan.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Button
                            className="w-full h-12 gap-4"
                            onClick={handleScan}
                            disabled={isScanning}
                        >
                            <Search className="h-5 w-5" />
                            {isScanning ? t('setup.scan.starting') : t('setup.scan.scanButton')}
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
