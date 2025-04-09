import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { Spinner } from '@/components/ui/spinner'
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ScanProgressProps {
    language: Language
    status: {
        status: 'idle' | 'processing' | 'completed'
        error: string | null
    }
    error: string | null
}

export function ScanProgress({ language }: ScanProgressProps) {
    const { t } = useTranslation(language)

    return (
        <>
            <CardHeader className="text-center">
                <div className="flex justify-center mb-6">
                    <Spinner className="h-8 w-8" />
                </div>
                <CardTitle className="text-4xl py-2 font-bold">
                    {t('setup.connect.starting')}
                </CardTitle>
                <CardDescription className="text-lg font-light">
                    {t('setup.connect.scanningDescription')}
                </CardDescription>
            </CardHeader>
        </>
    )
}
