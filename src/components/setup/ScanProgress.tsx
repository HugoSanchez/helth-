import { useEffect, useState } from 'react'
import { Progress } from "@/components/ui/progress"
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { Spinner } from '@/components/ui/spinner'

interface ScanStatus {
    status: 'idle' | 'scanning' | 'completed' | 'error'
    total_emails: number
    processed_emails: number
    total_documents: number
}

interface ScanProgressProps {
    language: Language
    status: ScanStatus
    error?: string | null
}

export function ScanProgress({ language, status, error }: ScanProgressProps) {
    const { t } = useTranslation(language)
    const MAX_EMAILS = 50 // Our current limit

    if (error) {
        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">{t('setup.connect.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('setup.connect.description')}</p>
                </div>
                <div className="text-destructive text-sm">
                    {error}
                </div>
            </div>
        )
    }

    if (status.status === 'idle') {
        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">{t('setup.connect.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('setup.connect.description')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-sm">{t('setup.connect.starting')}</span>
                </div>
            </div>
        )
    }

    const progress = status.processed_emails > 0
        ? Math.min(Math.round((status.processed_emails / MAX_EMAILS) * 100), 100)
        : 0

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">{t('setup.connect.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('setup.connect.description')}</p>
            </div>

            <div className="space-y-2">
                <Progress value={progress} />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                        {status.processed_emails} / {MAX_EMAILS} {t('setup.connect.emails')}
                    </span>
                    <span>
                        {status.total_documents} {t('setup.connect.documents')}
                    </span>
                </div>
            </div>

            {status.status === 'scanning' && (
                <p className="text-sm text-muted-foreground">
                    {t('dashboard.processing')}
                </p>
            )}

            {status.status === 'completed' && (
                <p className="text-sm text-green-600">
                    {t('setup.connect.completed')}
                </p>
            )}
        </div>
    )
}
