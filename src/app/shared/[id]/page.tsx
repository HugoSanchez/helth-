'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthRecord } from '@/types/health'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DocumentsTable } from '@/components/DocumentsTable'
import { usePreferences } from '@/hooks/usePreferences'

export default function SharedDocumentsPage({
    params
}: {
    params: { id: string }
}) {
    const router = useRouter()
    const [documents, setDocuments] = useState<HealthRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { preferences } = usePreferences()

    useEffect(() => {
        const loadSharedDocuments = async () => {
            try {
                console.log('[SharedPage] Loading documents for share:', params.id)
                const response = await fetch(`/api/shared/${params.id}`)

                if (!response.ok) {
                    const data = await response.json()
                    console.error('[SharedPage] Error response:', data)
                    throw new Error(data.error || 'Failed to load shared documents')
                }

                const { documents } = await response.json()
                console.log('[SharedPage] Loaded documents:', documents?.length || 0)
                setDocuments(documents)
            } catch (error) {
                console.error('[SharedPage] Error:', error)
                toast.error(error instanceof Error ? error.message : 'Failed to load shared documents')
                router.push('/dashboard')
            } finally {
                setIsLoading(false)
            }
        }

        loadSharedDocuments()
    }, [params.id, router])

    if (isLoading) {
        return (
            <main className="flex items-center justify-center min-h-screen">
                <p>Loading shared documents...</p>
            </main>
        )
    }

    return (
        <main className="py-12 md:px-16">
            <div className="flex flex-1 flex-col gap-4 mt-6 md:gap-8">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Shared Documents</CardTitle>
                        <CardDescription>
                            These documents have been shared with you
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DocumentsTable
                            documents={documents}
                            language={preferences?.language || 'en'}
                        />
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
