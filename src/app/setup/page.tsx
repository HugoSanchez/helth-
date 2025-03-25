'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from '@/lib/supabase'
import { saveUserPreferences, getUserPreferences } from '@/lib/client/db'
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'

export default function SetupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        displayName: '',
        language: 'en' as Language
    })

    const { t, setLanguage } = useTranslation(formData.language)

    // Load existing preferences
    useEffect(() => {
        async function loadPreferences() {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return

                const prefs = await getUserPreferences(session.user.id)
                if (prefs) {
                    setFormData({
                        displayName: prefs.display_name,
                        language: prefs.language
                    })
                    setLanguage(prefs.language)
                }
            } catch (err) {
                console.error('Error loading preferences:', err)
            }
        }

        loadPreferences()
    }, [setLanguage])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error('No session found')
            }

            await saveUserPreferences({
                user_id: session.user.id,
                display_name: formData.displayName,
                language: formData.language,
            })

            router.push('/dashboard')

        } catch (err) {
            console.error('Setup error:', err)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="flex justify-center min-h-screen py-20">
            <Card className="w-[600px]">
                <CardHeader>
                    <CardTitle className="text-5xl py-2 font-bold">{t('setup.welcome')}</CardTitle>
                    <CardDescription className="text-xl font-light">
                        {t('setup.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
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
                                className="w-full p-2 h-12 border rounded-md"
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
                            className="w-full h-12 mt-6 text-lg font-serif font-light"
                            disabled={isLoading}
                        >
                            {isLoading ? t('setup.settingUp') : t('setup.continue')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
