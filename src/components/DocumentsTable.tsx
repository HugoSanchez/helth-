import * as React from "react"
import Link from "next/link"
import { useState } from "react"
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
    Trash2,
    Pencil,
    X,
    Link2
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
import { format } from "date-fns"
import { HealthRecord } from "@/types/health"
import { FileUpload } from "@/components/ui/file-upload"
import { useTranslation } from "@/hooks/useTranslation"
import { Language } from '@/lib/translations'
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { cn } from "@/lib/client/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDocument } from '@/lib/api/documents'

const recordTypeConfig = {
    lab_report: { icon: TestTube, label: "documents.types.lab_report", backgroundColor: "" },
    prescription: { icon: Pill, label: "documents.types.prescription", backgroundColor: "" },
    imaging: { icon: Scan, label: "documents.types.imaging", backgroundColor: "" },
    clinical_notes: { icon: ClipboardList, label: "documents.types.clinical_notes", backgroundColor: "" },
    other: { icon: File, label: "documents.types.other", backgroundColor: "" }
} as const;

interface DocumentsTableProps {
    documents: HealthRecord[]
    onFileSelect?: (file: File) => Promise<void>
    onDeleteRecords?: (ids: string[]) => Promise<void>
    language?: Language
    isSharedView?: boolean
}

export function DocumentsTable({ documents, onFileSelect, onDeleteRecords, language = 'en', isSharedView = false }: DocumentsTableProps) {
    const { t } = useTranslation(language)
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [expandedRows, setExpandedRows] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null)

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

    const handleShare = async (ids: string[]) => {
        try {
            const response = await fetch('/api/documents/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentIds: ids }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create share')
            }

            const { url } = await response.json()

            // Copy to clipboard
            await navigator.clipboard.writeText(url)
            toast.success(t('documents.share.copied'))
        } catch (error) {
            console.error('Error sharing documents:', error)
            toast.error(t('documents.share.error'))
        }
    }

    const handleView = async (id: string) => {
        try {
            const response = await fetch(`/api/documents/${id}/view`)
            if (!response.ok) {
                throw new Error('Failed to get document')
            }

            const { url } = await response.json()
            if (!url) {
                throw new Error('No URL returned')
            }

            // Open in new tab
            window.open(url, '_blank', 'noopener,noreferrer')
        } catch (error) {
            console.error('Error viewing document:', error)
            toast.error(t('documents.view.error'))
        }
    }

    const handleDownload = async (id: string) => {
        try {
            const response = await fetch(`/api/documents/${id}/download`)
            if (!response.ok) {
                throw new Error('Failed to get download URL')
            }

            const { url } = await response.json()
            if (!url) {
                throw new Error('No URL returned')
            }

            // Create a temporary link and click it to start the download
            const link = document.createElement('a')
            link.href = url
            link.download = '' // Let the server set the filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Error downloading document:', error)
            toast.error(t('documents.download.error'))
        }
    }

    const handleFileSelect = async (file: File) => {
        if (!onFileSelect) return

        setIsUploading(true)

        const promise = onFileSelect(file)
        toast.promise(promise, {
            loading: t('documents.upload.loading'),
            success: t('documents.upload.success'),
            error: t('documents.upload.error'),
        })

        try {
            await promise
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async () => {
        if (!onDeleteRecords || selectedRows.length === 0) return;

        try {
            await onDeleteRecords(selectedRows);
            setSelectedRows([]); // Clear selection after successful deletion
        } catch (error) {
            console.error('Error deleting records:', error);
            // Error will be handled by the toast in the parent component
        }
    }

    const handleEdit = (record: HealthRecord) => {
        setEditingRecord(record)
    }

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingRecord) return

        const formData = new FormData(e.currentTarget)
        const updates = {
            display_name: formData.get('display_name') as string,
            record_type: formData.get('record_type') as HealthRecord['record_type'],
            doctor_name: formData.get('doctor_name') as string || undefined,
            date: formData.get('date') as string || undefined,
            summary: formData.get('summary') as string || undefined
        }

        const promise = updateDocument(editingRecord.id, updates)

        toast.promise(promise, {
            loading: t('documents.edit.loading'),
            success: t('documents.edit.success'),
            error: t('documents.edit.error'),
        })

        try {
            await promise
            setEditingRecord(null)
            // Refresh the documents list
            const updatedDoc = { ...editingRecord, ...updates }
            const updatedDocs = documents.map(doc =>
                doc.id === editingRecord.id ? updatedDoc : doc
            )
            // Update the documents array with the new data
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('documents-updated', { detail: updatedDocs }))
            }
        } catch (error) {
            console.error('Error updating document:', error)
            // Error will be handled by the toast
        }
    }

    if (documents.length === 0) {
        return (
            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle>{t('documents.title')}</CardTitle>
                    <CardDescription>
                        {t('documents.emptyState.title')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                    <FileUpload
                        onFileSelect={handleFileSelect}
                        disabled={!onFileSelect || isUploading}
                        className="bg-[#f8f7f5]"
                        message={t('documents.emptyState.message')}
                        language={language}
                    />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="xl:col-span-2 bg-muted/10 border border-border rounded-lg">
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>{t('documents.history')}</CardTitle>
                    <CardDescription>
                        {t('documents.description')}
                    </CardDescription>
                </div>
                {!isSharedView && (
                    <div className="flex items-center gap-2 ml-auto">
                        {selectedRows.length > 0 && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => handleShare(selectedRows)}
                                >
                                    <Link2 className="h-4 w-4 mr-2" />
                                    {t('documents.share.button')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedRows.length > 0 ? "destructive" : "outline"}
                                    className="h-8 w-8 p-0"
                                    onClick={handleDelete}
                                    disabled={selectedRows.length === 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">{t('common.delete')}</span>
                                </Button>
                            </>
                        )}
                        {onFileSelect && (
                            <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => document.getElementById('fileInput')?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <Spinner size="sm" className="mr-2" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                {t('common.upload')}
                            </Button>
                        )}
                    </div>
                )}
                <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                            handleFileSelect(file)
                        }
                    }}
                    disabled={isUploading}
                />
            </CardHeader>
            <CardContent className="relative">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            {!isSharedView && (
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedRows.length === documents.length}
                                        onCheckedChange={toggleAll}
                                        aria-label={t('documents.table.selectAll')}
                                        className="h-3.5 w-3.5"
                                    />
                                </TableHead>
                            )}
                            <TableHead className="w-[300px]">{t('documents.table.name')}</TableHead>
                            <TableHead className="w-[200px]">{t('documents.table.type')}</TableHead>
                            <TableHead className="hidden md:table-cell w-[200px]">{t('documents.table.doctor')}</TableHead>
                            <TableHead className="hidden md:table-cell w-[150px]">{t('documents.table.date')}</TableHead>
                            <TableHead className="w-[70px] text-right">{t('documents.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map(doc => {
                            const RecordIcon = recordTypeConfig[doc.record_type].icon;
                            const isExpanded = expandedRows.includes(doc.id);
                            return (
                                <React.Fragment key={doc.id}>
                                    <TableRow
                                        className={cn(
                                            "hover:bg-accent/50 cursor-pointer",
                                            isExpanded && "bg-accent/50"
                                        )}
                                        onClick={() => toggleExpand(doc.id)}
                                    >
                                        {!isSharedView && (
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedRows.includes(doc.id)}
                                                    onCheckedChange={() => toggleRow(doc.id)}
                                                    aria-label={t('documents.table.selectDocument').replace('{name}', doc.display_name)}
                                                    className="h-3.5 w-3.5"
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {doc.summary ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 p-0"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                ) : (
                                                    <div className="w-4" />
                                                )}
                                                <span className="font-medium">{doc.display_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs gap-2 border-none p-2 ${recordTypeConfig[doc.record_type].backgroundColor}`}
                                                >
                                                    <RecordIcon className={`h-4 w-4`} />
                                                    {t(recordTypeConfig[doc.record_type].label)}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {doc.doctor_name || t('documents.table.noDoctorSpecified')}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {doc.date ? format(new Date(doc.date), 'MMMM, yyyy') : t('documents.table.noDate')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                        <span className="sr-only">{t('documents.table.actions')}</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {doc.file_url && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleView(doc.id)}
                                                                className="flex items-center"
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                {t('documents.table.viewDocument')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDownload(doc.id)}
                                                                className="flex items-center"
                                                            >
                                                                <Download className="mr-2 h-4 w-4" />
                                                                {t('documents.table.download')}
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {!isSharedView && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleEdit(doc)}
                                                                className="flex items-center"
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                {t('documents.table.edit')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleShare([doc.id])}
                                                                className="flex items-center"
                                                            >
                                                                <Share2 className="mr-2 h-4 w-4" />
                                                                {t('documents.table.share')}
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && doc.summary && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={!isSharedView ? 6 : 5}
                                                className="bg-muted/5"
                                            >
                                                <div className="px-4 py-3">
                                                    <h4 className="font-medium mb-1">{t('documents.table.summary')}</h4>
                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doc.summary}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
            <Sheet open={editingRecord !== null} onOpenChange={() => setEditingRecord(null)}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t('documents.edit.title')}</SheetTitle>
                    </SheetHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="display_name">{t('documents.table.name')}</Label>
                                <Input
                                    id="display_name"
                                    name="display_name"
                                    defaultValue={editingRecord?.display_name}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="record_type">{t('documents.table.type')}</Label>
                                <Select
                                    name="record_type"
                                    defaultValue={editingRecord?.record_type}
                                    required
                                >
                                    <SelectTrigger id="record_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(recordTypeConfig).map(([value, config]) => (
                                            <SelectItem key={value} value={value}>
                                                <div className="flex items-center gap-2">
                                                    <config.icon className="h-4 w-4" />
                                                    {t(config.label)}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="doctor_name">{t('documents.table.doctor')}</Label>
                                <Input
                                    id="doctor_name"
                                    name="doctor_name"
                                    defaultValue={editingRecord?.doctor_name || ''}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date">{t('documents.table.date')}</Label>
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    defaultValue={editingRecord?.date ? new Date(editingRecord.date).toISOString().split('T')[0] : ''}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="summary">{t('documents.table.summary')}</Label>
                                <textarea
                                    id="summary"
                                    name="summary"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    defaultValue={editingRecord?.summary || ''}
                                    placeholder={t('documents.edit.summaryPlaceholder')}
                                />
                            </div>
                        </div>

                        <SheetFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingRecord(null)}
                            >
                                {t('documents.edit.cancel')}
                            </Button>
                            <Button type="submit">
                                {t('documents.edit.save')}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </Card>
    )
}
