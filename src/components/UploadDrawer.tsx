import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

interface UploadDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function UploadDrawer({ isOpen, onClose }: UploadDrawerProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFileSelect = async (file: File) => {
        try {
            setIsUploading(true)
            setError(null)
            setAnalysisResult(null)
            console.log("Starting upload for file:", file.name)

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error('No session found')
            }

            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/documents/analyze', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`)
            }

            const data = await response.json()
            console.log("Analysis complete:", data)
            setAnalysisResult(data.analysis)

        } catch (error) {
            console.error("Upload error:", error)
            setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            direction="right"
        >
            <DrawerContent side="right">
                <DrawerHeader>
                    <div className="flex items-center justify-between">
                        <DrawerTitle className="text-xl">Upload Medical Document</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </DrawerClose>
                    </div>
                    <DrawerDescription>
                        Upload a medical document to analyze and store in your records.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                    <FileUpload
                        onFileSelect={handleFileSelect}
                        disabled={isUploading}
                    />

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {analysisResult && (
                        <div className="mt-4 p-4 bg-green-50 rounded-md">
                            <h3 className="font-medium mb-2">Analysis Results:</h3>
                            <div className="text-sm space-y-2">
                                <p><strong>Type:</strong> {analysisResult.record_type}</p>
                                <p><strong>Name:</strong> {analysisResult.record_name}</p>
                                <p><strong>Doctor:</strong> {analysisResult.doctor_name || 'Not found'}</p>
                                <p><strong>Date:</strong> {analysisResult.date || 'Not found'}</p>
                                <p><strong>Summary:</strong> {analysisResult.summary}</p>
                            </div>
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
