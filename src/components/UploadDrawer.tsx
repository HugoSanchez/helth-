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

    const handleFileSelect = async (file: File) => {
        try {
            setIsUploading(true)
            console.log("Starting upload for file:", file.name)

            const { data: { session } } = await supabase.auth.getSession()
            console.log("Session details:", {
                hasSession: !!session,
                accessToken: session?.access_token?.slice(0, 20) + '...',  // Log part of token for debugging
                userId: session?.user?.id
            })

            if (!session) {
                throw new Error('No session found')
            }

            const formData = new FormData()
            formData.append('file', file)

            console.log("Making request with headers:", {
                Authorization: `Bearer ${session.access_token.slice(0, 20)}...`
            })

            const response = await fetch('/api/documents/process', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            console.log("Response status:", response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Response error details:", {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                })
                throw new Error(`Upload failed: ${response.statusText}`)
            }

            const data = await response.json()
            console.log("Upload successful:", data)

        } catch (error) {
            console.error("Upload error:", error)
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
                <div className="flex-1 overflow-y-auto mt-4">
                    <FileUpload
                        onFileSelect={handleFileSelect}
                        disabled={isUploading}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    )
}
