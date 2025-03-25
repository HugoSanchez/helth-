import * as React from "react"
import { useCallback, useState } from "react"
import { cn } from "@/lib/client/utils"
import { Upload } from "lucide-react"
import { Button } from "./button"

interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
    onFileSelect: (file: File) => void
    accept?: string
    maxSize?: number // in bytes
    disabled?: boolean
}

export function FileUpload({
    className,
    onFileSelect,
    accept = "application/pdf",
    maxSize = 10 * 1024 * 1024, // 10MB default
    disabled = false,
    ...props
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleFile = useCallback((file: File) => {
        if (disabled) return
        setError(null)

        if (!file.type.match(accept)) {
            setError("Please upload a PDF file")
            return
        }

        if (file.size > maxSize) {
            setError("File is too large. Maximum size is 10MB")
            return
        }

        onFileSelect(file)
    }, [accept, maxSize, onFileSelect, disabled])

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        if (disabled) return

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFile(file)
        }
    }, [handleFile, disabled])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (!disabled) {
            setIsDragging(true)
        }
    }, [disabled])

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleClick = () => {
        if (!disabled) {
            fileInputRef.current?.click()
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full h-64 p-6 border-2 border-dashed rounded-lg transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                disabled && "opacity-60 cursor-not-allowed",
                className
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            {...props}
        >
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleFileInput}
                disabled={disabled}
            />

            <Upload className="w-10 h-10 mb-4 text-muted-foreground" />
            <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                    PDF (up to 10MB)
                </p>
            </div>

            <Button
                variant="secondary"
                className="mt-4"
                onClick={handleClick}
                disabled={disabled}
            >
                Browse Files
            </Button>

            {error && (
                <p className="absolute bottom-2 left-0 right-0 text-center text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    )
}
