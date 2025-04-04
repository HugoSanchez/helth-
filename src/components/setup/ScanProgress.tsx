import { useEffect, useState } from 'react'
import { Progress } from "@/components/ui/progress"
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { Spinner } from '@/components/ui/spinner'
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ScanProgressProps {
    language: Language
}

interface ScanStatus {
    status: 'pending' | 'scanning' | 'completed' | 'error'
    total_emails: number
    processed_emails: number
    total_documents: number
    error?: string
}

export function ScanProgress({ language }: ScanProgressProps) {
    const { t } = useTranslation(language)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [status, setStatus] = useState<ScanStatus>({
        status: 'pending',
        total_emails: 0,
        processed_emails: 0,
        total_documents: 0
    })
    const [error, setError] = useState<string | null>(null)

    const startScan = async () => {
        try {
            const response = await fetch('/api/documents/scan', {
                method: 'POST',
            })

            if (!response.ok) {
                throw new Error('Failed to start scan')
            }

            const data = await response.json()
            setSessionId(data.sessionId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start scan')
        }
    }

    const processBatch = async (startIndex: number) => {
        if (!sessionId) return

        try {
            const response = await fetch('/api/documents/scan/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId, startIndex }),
            })

            if (!response.ok) {
                throw new Error('Failed to process batch')
            }

            const data = await response.json()
            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process batch')
            return null
        }
    }

    const checkStatus = async () => {
        if (!sessionId) return

        try {
            const response = await fetch(`/api/documents/scan/${sessionId}/status`)
            if (!response.ok) {
                throw new Error('Failed to fetch status')
            }

            const data = await response.json()
            setStatus(data)

            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch status')
            return null
        }
    }

    useEffect(() => {
        if (!sessionId) {
            startScan()
            return
        }

        let isProcessing = false
        let currentIndex = 0

        const processNextBatch = async () => {
            if (isProcessing) return
            isProcessing = true

            try {
                const result = await processBatch(currentIndex)
                if (!result) return

                await checkStatus()

                if (result.isComplete) {
                    return
                }

                currentIndex = result.nextIndex
                setTimeout(processNextBatch, 1000) // Wait 1 second between batches
            } finally {
                isProcessing = false
            }
        }

        processNextBatch()
    }, [sessionId])

    const progress = status.total_emails > 0
        ? Math.round((status.processed_emails / status.total_emails) * 100)
        : 0

    return (
        <>
            <CardHeader>
                <CardTitle className="text-4xl py-2 font-bold">
                    {status.status === 'completed'
                        ? "Great! We found some documents"
                        : "Scanning your inbox"}
                </CardTitle>
                <CardDescription className="text-lg font-light">
                    {status.status === 'pending' && (
                        "We're getting everything ready to scan your inbox. This will only take a moment..."
                    )}
                    {status.status === 'scanning' && (
                        "We're looking through your emails for any medical documents. Don't worry, we only look at emails with attachments."
                    )}
                    {status.status === 'completed' && (
                        `We found ${status.total_documents} medical documents in your inbox. Let's organize them for you.`
                    )}
                    {status.status === 'error' && error}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {/* Progress Section */}
                    <div className="space-y-6">
                        {status.status === 'pending' && (
                            <div className="flex items-center justify-center py-12">
                                <Spinner size="lg" />
                            </div>
                        )}

                        {(status.status === 'scanning' || status.status === 'completed') && (
                            <>
                                <Progress value={progress} className="h-2" />
                                <div className="grid grid-cols-2 gap-8 text-center">
                                    <div className="space-y-2">
                                        <p className="text-5xl font-bold tracking-tight">
                                            {status.processed_emails}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('setup.connect.emails')}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-5xl font-bold tracking-tight text-primary">
                                            {status.total_documents}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('setup.connect.documents')}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {status.status === 'error' && (
                            <div className="text-center py-12">
                                <p className="text-destructive">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </>
    )
}
