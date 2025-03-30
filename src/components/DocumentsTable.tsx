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
import { format } from "date-fns"
import { HealthRecord } from "@/types/health"
import { FileUpload } from "@/components/ui/file-upload"
import { useTranslation } from "@/hooks/useTranslation"
import { Language } from '@/lib/translations'
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { cn } from "@/lib/client/utils"

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
    language?: Language
}

export function DocumentsTable({ documents, onFileSelect, language = 'en' }: DocumentsTableProps) {
    const { t } = useTranslation(language)
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [expandedRows, setExpandedRows] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)

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
        <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>{t('documents.title')}</CardTitle>
                    <CardDescription>
                        {t('documents.description')}
                    </CardDescription>
                </div>
                {onFileSelect && (
                    <Button
                        size="sm"
                        className="gap-1 ml-auto"
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
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedRows.length === documents.length}
                                    onCheckedChange={toggleAll}
                                    aria-label={t('documents.table.selectAll')}
                                    className="h-3.5 w-3.5"
                                />
                            </TableHead>
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
                                <>
                                    <TableRow
                                        key={doc.id}
                                        data-state={selectedRows.includes(doc.id) ? "selected" : undefined}
                                        onClick={(e) => {
                                            // Don't toggle if clicking on checkbox or action buttons
                                            if (
                                                e.target instanceof HTMLElement &&
                                                (e.target.closest('button') || e.target.closest('input'))
                                            ) {
                                                return;
                                            }
                                            if (doc.summary) {
                                                toggleExpand(doc.id);
                                            }
                                        }}
                                        className={cn(
                                            "cursor-pointer transition-colors",
                                            doc.summary ? "hover:bg-muted/50" : "",
                                            !doc.summary && "cursor-default"
                                        )}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedRows.includes(doc.id)}
                                                onCheckedChange={() => toggleRow(doc.id)}
                                                aria-label={t('documents.table.selectDocument').replace('{name}', doc.display_name)}
                                                className="h-3.5 w-3.5"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {doc.display_name}
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
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={doc.file_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center"
                                                                >
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    {t('documents.table.viewDocument')}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={`${doc.file_url}?download=true`}
                                                                    download
                                                                    className="flex items-center"
                                                                >
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    {t('documents.table.download')}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleShare(doc.id)}
                                                        className="flex items-center"
                                                    >
                                                        <Share2 className="mr-2 h-4 w-4" />
                                                        {t('documents.table.share')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && doc.summary && (
                                        <TableRow>
                                            <TableCell colSpan={7}>
                                                <div className="px-4 py-3 bg-muted/20 rounded-md">
                                                    <h4 className="font-medium mb-1">{t('documents.table.summary')}</h4>
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
