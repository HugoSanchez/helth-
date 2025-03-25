'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { useSession } from '@/hooks/useSession'
import { usePreferences } from '@/hooks/usePreferences'
import { Breadcrumb, type BreadcrumbStep } from '@/components/ui/breadcrumb'
import { useTranslation } from '@/hooks/useTranslation'
import { PreferencesStep } from '@/components/setup/PreferencesStep'
import { ConnectStep } from '@/components/setup/ConnectStep'

export default function SetupPage() {
    const { session, loading: sessionLoading } = useSession({ redirectTo: '/login' })
    const { preferences, loading: prefsLoading } = usePreferences()
    const [currentStep, setCurrentStep] = useState(1)
    const { t } = useTranslation(preferences?.language || 'en')

    const steps: BreadcrumbStep[] = [
        {
            label: t('setup.steps.preferences'),
            active: currentStep === 1,
            completed: currentStep > 1,
            onClick: currentStep === 2 ? () => setCurrentStep(1) : undefined
        },
        {
            label: t('setup.steps.connect'),
            active: currentStep === 2,
            completed: currentStep > 2
        },
        {
            label: t('setup.steps.ready'),
            active: false,
            completed: false
        }
    ]

    // Show loading state while checking session or loading preferences
    if (sessionLoading || prefsLoading) {
        return (
            <main className="flex justify-center items-center min-h-screen">
                <p>{t('common.loading')}</p>
            </main>
        )
    }

    return (
        <main className="flex justify-center min-h-screen py-10">
            <Card className="w-[600px]">
                <div className="px-6 pt-6">
                    <Breadcrumb steps={steps} />
                </div>

                {currentStep === 1 ? (
                    <PreferencesStep
                        onComplete={() => setCurrentStep(2)}
                        initialPreferences={preferences}
                    />
                ) : (
                    <ConnectStep />
                )}
            </Card>
        </main>
    )
}
