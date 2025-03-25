'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { useSession } from '@/hooks/useSession'
import { usePreferences } from '@/hooks/usePreferences'
import { Breadcrumb, type BreadcrumbStep } from '@/components/ui/breadcrumb'

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

export default function SetupPage() {
    const router = useRouter()
    const { session, loading: sessionLoading } = useSession({ redirectTo: '/login' })
    const { preferences, loading: prefsLoading, updatePreferences } = usePreferences()
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        displayName: '',
        language: 'en' as Language
    })

    const { t, setLanguage } = useTranslation(formData.language)

    // Load existing preferences
    useEffect(() => {
        if (preferences) {
            setFormData({
                displayName: preferences.displayName,
                language: preferences.language
            })
            setLanguage(preferences.language)
        }
    }, [preferences, setLanguage])

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

    const handlePreferencesSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            if (!session) {
                throw new Error('No session found')
            }

            await updatePreferences({
                displayName: formData.displayName,
                language: formData.language,
            })

            setCurrentStep(2)

        } catch (err) {
            console.error('Setup error:', err)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

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
                    <>
                        <CardHeader>
                            <CardTitle className="text-4xl py-2 font-bold">{t('setup.welcome')}</CardTitle>
                            <CardDescription className="text-lg font-light">
                                {t('setup.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePreferencesSubmit}>
                                <div className="space-y-2">
                                    <label htmlFor="displayName" className="text-md">
                                        {t('setup.nameLabel')}
                                    </label>
                                    <input
                                        id="displayName"
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            displayName: e.target.value
                                        }))}
                                        className="w-full p-2 h-12 border rounded-md text-sm"
                                        required
                                    />
                                </div>

                                <div className="mt-4 space-y-2">
                                    <label className="text-md">
                                        {t('setup.languageLabel')}
                                    </label>
                                    <Select
                                        value={formData.language}
                                        onValueChange={(value: Language) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                language: value
                                            }))
                                            setLanguage(value)
                                        }}
                                        required
                                    >
                                        <SelectTrigger className="w-full h-12 bg-white">
                                            <SelectValue placeholder={t('setup.languageLabel')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">{t('languages.english')}</SelectItem>
                                            <SelectItem value="es">{t('languages.spanish')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {error && (
                                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-12 mt-6"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('setup.settingUp') : t('common.continue')}
                                </Button>
                            </form>
                        </CardContent>
                    </>
                ) : (
                    <>
                        <CardHeader>
                            <CardTitle className="text-4xl py-2 font-bold">{t('setup.connect.title')}</CardTitle>
                            <CardDescription className="text-lg font-light">
                                {t('setup.connect.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <Button
                                    className="w-full h-12 gap-4"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    <GoogleLogo />
                                    {t('dashboard.scanButton')}
                                </Button>
                                <div>
                                    <Button
                                        variant="link"
                                        onClick={() => router.push('/dashboard')}
                                        className="w-full font-serif font-light justify-start p-0"
                                    >
                                        {t('common.skip')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </>
                )}
            </Card>
        </main>
    )
}
