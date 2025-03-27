import * as React from "react"
import { useCallback, useState } from "react"
import { cn } from "@/lib/client/utils"
import { Upload } from "lucide-react"
import { Button } from "./button"
import { useTranslation } from "@/hooks/useTranslation"

interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
    onFileSelect: (file: File) => void
    accept?: string
    maxSize?: number // in bytes
    disabled?: boolean
    message?: string
}

export function FileUpload({
    className,
    onFileSelect,
    accept = "application/pdf",
    maxSize = 10 * 1024 * 1024, // 10MB default
    disabled = false,
    message,
    ...props
}: FileUploadProps) {
    const { t } = useTranslation()
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleFile = useCallback((file: File) => {
        if (disabled) return
        setError(null)

        if (!file.type.match(accept)) {
            setError(t('fileUpload.errors.pdfOnly'))
            return
        }

        if (file.size > maxSize) {
            setError(t('fileUpload.errors.tooLarge'))
            return
        }

        onFileSelect(file)
    }, [accept, maxSize, onFileSelect, disabled, t])

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

            <Upload className="w-10 h-10 mb-4 text-black" />

            {message && (
                <p className="text-xl font-serif font-bold mb-2">
                    {message}
                </p>
            )}

            <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground font-light">
                    {t('fileUpload.dragDrop')}
                </p>
                <p className="text-xs text-muted-foreground">
                    {t('fileUpload.fileSize')}
                </p>
            </div>

            <Button
                variant="default"
                className="mt-4"
                onClick={handleClick}
                disabled={disabled}
            >
                {t('common.browse')}
            </Button>

            {error && (
                <p className="absolute bottom-2 left-0 right-0 text-center text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    )
}
