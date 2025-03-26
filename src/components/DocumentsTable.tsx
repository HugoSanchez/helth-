import Link from "next/link"
import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import {
    ArrowUpRight,
    TestTube,
    Pill,
    Scan,
    ClipboardList,
    File,
    Download,
    Eye,
    Share2,
    MoreVertical,
    ChevronDown,
    ChevronRight,
    Upload,
    X
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/client/utils"
import { format } from "date-fns"
import { HealthRecord } from "@/types/health"

const recordTypeConfig = {
    lab_report: { icon: TestTube, label: "Lab Report", backgroundColor: "" },
    prescription: { icon: Pill, label: "Prescription", backgroundColor: "" },
    imaging: { icon: Scan, label: "Imaging", backgroundColor: "" },
    clinical_notes: { icon: ClipboardList, label: "Clinical Notes", backgroundColor: "" },
    other: { icon: File, label: "Other", backgroundColor: "" }
} as const;

interface DocumentsTableProps {
    documents: HealthRecord[]
    onFileSelect?: (file: File) => void
}

export function DocumentsTable({ documents, onFileSelect }: DocumentsTableProps) {
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [expandedRows, setExpandedRows] = useState<string[]>([])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        console.log('onDrop triggered with files:', acceptedFiles.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
        })))

        const file = acceptedFiles[0]
        if (!file) {
            console.log('No file provided')
            return
        }

        // Validate file type
        if (!file.type.includes('pdf')) {
            console.log('Invalid file type:', file.type)
            setError('Please upload a PDF file')
            return
        }

        // Validate file size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB in bytes
        if (file.size > MAX_SIZE) {
            console.log('File too large:', file.size)
            setError('File size must be less than 10MB')
            return
        }

        console.log('File validation passed, calling onFileSelect with file:', file.name)
        setSelectedFile(file)
        onFileSelect?.(file)
    }, [onFileSelect])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        disabled: !onFileSelect
    })

    const toggleAll = () => {
        if (selectedRows.length === documents.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(documents.map(doc => doc.id))
        }
    }

    const toggleRow = (id: string) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id))
        } else {
            setSelectedRows([...selectedRows, id])
        }
    }

    const toggleExpand = (id: string) => {
        if (expandedRows.includes(id)) {
            setExpandedRows(expandedRows.filter(rowId => rowId !== id))
        } else {
            setExpandedRows([...expandedRows, id])
        }
    }

    const handleShare = (id: string) => {
        // TODO: Implement sharing functionality
        console.log('Share document:', id)
    }

    if (documents.length === 0) {
        return (
            <Card className="xl:col-span-2 ">
                <CardHeader>
                    <CardTitle>Your documents</CardTitle>
                    <CardDescription>
                        Start by uploading your first document
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        {...getRootProps()}
                        className={cn(
                            "relative border-2 border-dashed rounded-lg p-8 transition-colors",
                            isDragActive ? "border-primary bg-primary/5" : "bg-[#f8f7f5]",
                            selectedFile && "border-success bg-success/5",
                            error && "border-destructive bg-destructive/5",
                            !onFileSelect && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            {!selectedFile && !error && (
                                <>
                                    <Upload className="h-12 w-12 text-muted-foreground" />
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">
                                            {isDragActive ? "Drop your file here" : "No documents yet"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                            {onFileSelect
                                                ? "Drag and drop your PDF file here, or click to browse. We support PDF files up to 10MB."
                                                : "You don't have any documents yet. They will appear here once uploaded."
                                            }
                                        </p>
                                    </div>
                                    {onFileSelect && (
                                        <Button variant="default" className="mt-4">
                                            Choose file
                                        </Button>
                                    )}
                                </>
                            )}

                            {selectedFile && (
                                <div className="flex items-center gap-4">
                                    <File className="h-8 w-8 text-primary" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedFile(null)
                                            setError(null)
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {error && (
                                <div className="text-center space-y-2">
                                    <p className="text-destructive font-medium">{error}</p>
                                    <Button
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setError(null)
                                        }}
                                    >
                                        Try again
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Your documents</CardTitle>
                    <CardDescription>
                        From most recent to oldest.
                    </CardDescription>
                </div>
                {onFileSelect && (
                    <div {...getRootProps()} className="ml-auto">
                        <input {...getInputProps()} />
                        <Button size="sm" className="gap-1">
                            <Upload className="h-4 w-4" />
                            Upload
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedRows.length === documents.length}
                                    onCheckedChange={toggleAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="hidden md:table-cell">Doctor</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="w-[70px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map(doc => {
                            const RecordIcon = recordTypeConfig[doc.record_type].icon;
                            const isExpanded = expandedRows.includes(doc.id);
                            return (
                                <>
                                    <TableRow key={doc.id} data-state={selectedRows.includes(doc.id) ? "selected" : undefined}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedRows.includes(doc.id)}
                                                onCheckedChange={() => toggleRow(doc.id)}
                                                aria-label={`Select ${doc.record_name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleExpand(doc.id)}
                                                className={`h-8 w-8 ${!doc.summary ? 'opacity-50' : ''}`}
                                                disabled={!doc.summary}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{doc.record_name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs gap-2 border-none p-2 ${recordTypeConfig[doc.record_type].backgroundColor}`}
                                                >
                                                    <RecordIcon className={`h-4 w-4`} />
                                                    {recordTypeConfig[doc.record_type].label}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {doc.doctor_name || 'No doctor specified'}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {doc.date ? format(new Date(doc.date), 'MMMM, yyyy') : 'No date'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {doc.file_url && (
                                                        <>
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={doc.file_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center"
                                                                >
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    View document
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={`${doc.file_url}?download=true`}
                                                                    download
                                                                    className="flex items-center"
                                                                >
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Download
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleShare(doc.id)}
                                                        className="flex items-center"
                                                    >
                                                        <Share2 className="mr-2 h-4 w-4" />
                                                        Share
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && doc.summary && (
                                        <TableRow>
                                            <TableCell colSpan={7}>
                                                <div className="px-4 py-3 bg-muted/20 rounded-md">
                                                    <h4 className="font-medium mb-1">Summary</h4>
                                                    <p className="text-sm text-muted-foreground">{doc.summary}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
