'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { usePreferences } from '@/hooks/usePreferences'
import { Breadcrumb, type BreadcrumbStep } from '@/components/ui/breadcrumb'
import { useTranslation } from '@/hooks/useTranslation'
import { PreferencesStep } from '@/components/setup/PreferencesStep'
import { ConnectStep } from '@/components/setup/ConnectStep'
import { ScanStep } from '@/components/setup/ScanStep'
import { useSearchParams } from 'next/navigation'

export default function SettingsPage() {
    const searchParams = useSearchParams()
    const { preferences, loading: prefsLoading, error: prefsError } = usePreferences()
    const [currentStep, setCurrentStep] = useState(() => {
        const step = searchParams.get('step')
        return step ? parseInt(step) : 1
    })
    const { t } = useTranslation(preferences?.language || 'en')

    const steps: BreadcrumbStep[] = [
        {
            label: t('setup.steps.preferences'),
            active: currentStep === 1,
            completed: currentStep > 1,
            onClick: currentStep > 1 ? () => setCurrentStep(1) : undefined
        },
        {
            label: t('setup.steps.connect'),
            active: currentStep === 2,
            completed: currentStep > 2,
            onClick: currentStep === 3 ? () => setCurrentStep(2) : undefined
        },
        {
            label: t('setup.steps.scan'),
            active: currentStep === 3,
            completed: false
        }
    ]

    // Show loading state while loading preferences
    if (prefsLoading) {
        return (
            <main className="flex justify-center items-center min-h-screen">
                <p>{t('common.loading')}</p>
            </main>
        )
    }

    // Show error state if there's an error
    if (prefsError) {
        return (
            <main className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Error</h2>
                    <p className="text-red-500">{prefsError}</p>
                </div>
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
                ) : currentStep === 2 ? (
                    <ConnectStep
                        onComplete={() => setCurrentStep(3)}
                        preferences={preferences}
                    />
                ) : (
                    <ScanStep
                        onComplete={() => {}}
                        onSkip={() => {}}
                        preferences={preferences}
                    />
                )}
            </Card>
        </main>
    )
}
