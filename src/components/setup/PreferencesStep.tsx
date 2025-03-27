import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from '@/hooks/useTranslation'
import { Language } from '@/lib/translations'
import { usePreferences, type Preferences } from '@/hooks/usePreferences'

interface PreferencesStepProps {
    onComplete: () => void
    initialPreferences: Preferences | null
    onPreferencesUpdate?: (newPreferences: Preferences) => void
}

export function PreferencesStep({ onComplete, initialPreferences, onPreferencesUpdate }: PreferencesStepProps) {
    const { updatePreferences } = usePreferences()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        display_name: initialPreferences?.display_name || '',
        language: initialPreferences?.language || 'en' as Language
    })

    const { t, setLanguage } = useTranslation(formData.language)

    useEffect(() => {
        if (initialPreferences) {
            setFormData({
                display_name: initialPreferences.display_name,
                language: initialPreferences.language
            })
            setLanguage(initialPreferences.language)
        }
    }, [initialPreferences, setLanguage])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const newPreferences = {
                display_name: formData.display_name,
                language: formData.language,
            }

            await updatePreferences(newPreferences)

            // Notify parent component of the update
            onPreferencesUpdate?.(newPreferences as Preferences)
            onComplete()
        } catch (err) {
            console.error('Setup error:', err)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <CardHeader>
                <CardTitle className="text-4xl py-2 font-bold">{t('setup.welcome')}</CardTitle>
                <CardDescription className="text-lg font-light">
                    {t('setup.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="display_name" className="text-md">
                            {t('setup.nameLabel')}
                        </label>
                        <input
                            id="display_name"
                            type="text"
                            value={formData.display_name}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                display_name: e.target.value
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
    )
}
