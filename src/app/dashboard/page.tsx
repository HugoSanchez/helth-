'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePreferences } from '@/hooks/usePreferences'
import { DocumentsTable } from '@/components/DocumentsTable'
import { useTranslation } from '@/hooks/useTranslation'
import { HealthRecord } from '@/types/health'
import { Upload, Link2 } from 'lucide-react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from '@/components/ui/avatar'
import { fetchUserDocuments, analyzeDocument, deleteDocuments, APIError } from '@/lib/api/documents'
import { toast } from "sonner"

export default function DashboardPage() {
	const { preferences, loading: prefsLoading, error: prefsError } = usePreferences()
	const { t } = useTranslation(preferences?.language || 'en')
	const [documents, setDocuments] = useState<HealthRecord[]>([])
	const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Fetch documents on mount
	useEffect(() => {
		let mounted = true

		const loadDocuments = async () => {
			try {
				const data = await fetchUserDocuments()
				if (mounted) {
					setDocuments(data)
				}
			} catch (err) {
				console.error('Failed to fetch documents:', err)
				if (mounted) {
					setError(err instanceof Error ? err.message : 'Failed to fetch documents')
				}
			} finally {
				if (mounted) {
					setIsLoading(false)
				}
			}
		}

		loadDocuments()

		// Listen for document updates
		const handleDocumentsUpdate = (event: CustomEvent<HealthRecord[]>) => {
			if (mounted) {
				setDocuments(event.detail)
			}
		}

		window.addEventListener('documents-updated', handleDocumentsUpdate as EventListener)

		return () => {
			mounted = false
			window.removeEventListener('documents-updated', handleDocumentsUpdate as EventListener)
		}
	}, [])

	const handleFileSelect = async (file: File) => {
		try {
			console.log('Starting document analysis for:', file.name)
			const result = await analyzeDocument(file)
			console.log('Analysis response:', result)

			const newDocs = await fetchUserDocuments()
			setDocuments(newDocs)
		} catch (err) {
			console.error('Error uploading document:', err)
			setError(err instanceof Error ? err.message : 'Failed to upload document')
			throw err // Re-throw to let DocumentsTable handle the error state
		}
	}

	const handleDelete = async (recordIds: string[]) => {
		const promise = (async () => {
			await deleteDocuments(recordIds)
			const newDocs = await fetchUserDocuments()
			setDocuments(newDocs)
		})()

		toast.promise(promise, {
			loading: t('documents.delete.loading'),
			success: t('documents.delete.success'),
			error: t('documents.delete.error')
		})

		try {
			await promise
		} catch (err) {
			console.error('Error deleting documents:', err)
			throw err
		}
	}

	const handleShare = async () => {
		try {
			const response = await fetch('/api/documents/share', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					documentIds: selectedDocuments.length ? selectedDocuments : documents.map(d => d.id)
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to create share link')
			}

			const { url } = await response.json()
			await navigator.clipboard.writeText(url)
			toast.success(t('documents.share.success'))
		} catch (err) {
			console.error('Error sharing documents:', err)
			toast.error(t('documents.share.error'))
		}
	}

	if (prefsLoading || isLoading) {
		return (
			<main className="flex items-center justify-center min-h-screen">
				<p>{t('common.loading')}</p>
			</main>
		)
	}

	return (
		<main className="py-12 md:px-16">
			<div className="flex items-center justify-between pb-4">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold">
						{t('dashboard.greeting').replace('{name}', preferences?.display_name || '')}
					</h1>
					<h1 className="text-2xl font-light">
						{t('dashboard.thisIsYourDashboard')}
					</h1>
				</div>
				<div className="flex gap-2">
					<Button
						className="gap-2 text-md font-sans bg-gray-800 hover:bg-gray-800 hover:opacity-90 text-white font-medium"
						onClick={handleShare}
					>
						<Link2 className="h-5 w-5 mr-3" />
						{selectedDocuments.length > 0
							? t('documents.share.selected').replace('{count}', selectedDocuments.length.toString())
							: t('documents.share.all')}
					</Button>
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-4 mt-6 md:gap-8">
				<div className="">
					<DocumentsTable
						documents={documents}
						onFileSelect={handleFileSelect}
						onDeleteRecords={handleDelete}
						onSelectionChange={setSelectedDocuments}
						language={preferences?.language || 'en'}
					/>
				</div>
			</div>
		</main>
	)
}
