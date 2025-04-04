import { useEffect, useState } from 'react'
import { Progress } from "@/components/ui/progress"
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { Spinner } from '@/components/ui/spinner'

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
    const [status, setStatus] = useState<ScanStatus | null>(null)
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

    if (error) {
        return (
            <div className="text-destructive text-sm mt-4">
                {error}
            </div>
        )
    }

    if (!status) {
        return (
            <div className="flex items-center gap-2 mt-4">
                <Spinner size="sm" />
                <span className="text-sm">{t('setup.connect.starting')}</span>
            </div>
        )
    }

    const progress = status.total_emails > 0
        ? Math.round((status.processed_emails / status.total_emails) * 100)
        : 0

    return (
        <div className="space-y-4 mt-4">
            <div className="space-y-2">
                <Progress value={progress} />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                        {status.processed_emails} / {status.total_emails} {t('setup.connect.emails')}
                    </span>
                    <span>
                        {status.total_documents} {t('setup.connect.documents')}
                    </span>
                </div>
            </div>

            {status.status === 'completed' && (
                <p className="text-sm text-green-600">
                    {t('setup.connect.completed')}
                </p>
            )}
        </div>
    )
}
