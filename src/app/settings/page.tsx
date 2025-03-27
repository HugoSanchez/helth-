'use client'

import { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"
import { usePreferences } from '@/hooks/usePreferences'
import { Breadcrumb, type BreadcrumbStep } from '@/components/ui/breadcrumb'
import { useTranslation } from '@/hooks/useTranslation'
import { PreferencesStep } from '@/components/setup/PreferencesStep'
import { ConnectStep } from '@/components/setup/ConnectStep'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { preferences, loading: prefsLoading, error: prefsError } = usePreferences()
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation(preferences?.language || 'en')

    // Check authentication and initialize
    useEffect(() => {
        let mounted = true

        const initializeSettings = async () => {
            try {
                // Check auth first
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.replace('/login')
                    return
                }
            } catch (err) {
                console.error('Settings initialization error:', err)
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Authentication failed')
                    router.replace('/login')
                }
            } finally {
                if (mounted) {
                    setIsLoading(false)
                }
            }
        }

        initializeSettings()

        return () => {
            mounted = false
        }
    }, [router, supabase])

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

    // Show loading state while checking auth or loading preferences
    if (isLoading || prefsLoading) {
        return (
            <main className="flex justify-center items-center min-h-screen">
                <p>{t('common.loading')}</p>
            </main>
        )
    }

    // Show error state if there's an error
    if (error || prefsError) {
        return (
            <main className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Error</h2>
                    <p className="text-red-500">{error || prefsError}</p>
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
                ) : (
                    <ConnectStep />
                )}
            </Card>
        </main>
    )
}
