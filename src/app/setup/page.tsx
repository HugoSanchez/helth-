'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from '@/lib/supabase'
import { saveUserPreferences } from '@/lib/client/db'

export default function SetupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        displayName: '',
        language: 'en' as 'en' | 'es'
    })

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
        <main className="flex justify-center min-h-screen py-24">
            <Card className="w-[600px]">
                <CardHeader>
                    <CardTitle className="text-5xl py-2 font-bold">Welcome to helth</CardTitle>
                    <CardDescription className="text-xl font-light">
                        Let's get to know you better. Please provide your name and preferred language.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label htmlFor="displayName" className="text-md">
                                What's your name?
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
                                Choose your language
                            </label>
                            <Select
                                value={formData.language}
                                onValueChange={(value) => setFormData(prev => ({
                                    ...prev,
                                    language: value as 'en' | 'es'
                                }))}
                                required
                            >
                                <SelectTrigger className="w-full h-12 bg-white">
                                    <SelectValue placeholder="Select a language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Español</SelectItem>
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
                            {isLoading ? 'Setting up...' : 'Continue'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
