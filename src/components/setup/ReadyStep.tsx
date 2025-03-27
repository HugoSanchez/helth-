import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from '@/hooks/useTranslation'
import { FileUpload } from '@/components/ui/file-upload'
import type { Preferences } from '@/hooks/usePreferences'

interface ReadyStepProps {
    preferences: Preferences | null
}

export function ReadyStep({ preferences }: ReadyStepProps) {
    const router = useRouter()
    const { t } = useTranslation(preferences?.language || 'en')

    return (
        <>
            <CardHeader>
                <CardTitle className="text-4xl py-2 font-bold">{t('setup.upload.title')}</CardTitle>
                <CardDescription className="text-lg font-light">
                    {t('setup.upload.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FileUpload onFileSelect={() => {}} />
            </CardContent>
        </>
    )
}
