import Link from "next/link"
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
    MoreVertical
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
import { useState } from "react"
import { format } from "date-fns"

interface HealthRecord {
    id: string;
    record_name: string;
    record_type: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other";
    doctor_name: string | null;
    date: string | null;
    file_url: string | null;
}

const recordTypeConfig = {
    lab_report: { icon: TestTube, label: "Lab Report", backgroundColor: "" },
    prescription: { icon: Pill, label: "Prescription", backgroundColor: "" },
    imaging: { icon: Scan, label: "Imaging", backgroundColor: "" },
    clinical_notes: { icon: ClipboardList, label: "Clinical Notes", backgroundColor: "" },
    other: { icon: File, label: "Other", backgroundColor: "" }
} as const;

export function DocumentsTable() {
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const rows: HealthRecord[] = [
        {
            id: "1",
            record_name: "Blood Test Results",
            record_type: "lab_report",
            doctor_name: "Dr. Sarah Wilson",
            date: "2024-03-15",
            file_url: "/documents/blood-test.pdf"
        },
        {
            id: "2",
            record_name: "Annual Physical Notes",
            record_type: "clinical_notes",
            doctor_name: "Dr. James Chen",
            date: "2024-02-20",
            file_url: "/documents/physical-notes.pdf"
        }
    ]

    const toggleAll = () => {
        if (selectedRows.length === rows.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(rows.map(row => row.id))
        }
    }

    const toggleRow = (id: string) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id))
        } else {
            setSelectedRows([...selectedRows, id])
        }
    }

    const handleShare = (id: string) => {
        // TODO: Implement sharing functionality
        console.log('Share document:', id)
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
                <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="#">
                        View All
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedRows.length === rows.length}
                                    onCheckedChange={toggleAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="hidden md:table-cell">Doctor</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="w-[70px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map(row => {
                            const RecordIcon = recordTypeConfig[row.record_type].icon;
                            return (
                                <TableRow key={row.id} data-state={selectedRows.includes(row.id) ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRows.includes(row.id)}
                                            onCheckedChange={() => toggleRow(row.id)}
                                            aria-label={`Select ${row.record_name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{row.record_name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs gap-2 border-none p-2 ${recordTypeConfig[row.record_type].backgroundColor}`}
                                            >
												<RecordIcon className={`h-4 w-4`} />
                                                {recordTypeConfig[row.record_type].label}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {row.doctor_name || 'No doctor specified'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {row.date ? format(new Date(row.date), 'MMMM, yyyy') : 'No date'}
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
                                                {row.file_url && (
                                                    <>
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href={row.file_url}
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
                                                                href={`${row.file_url}?download=true`}
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
                                                    onClick={() => handleShare(row.id)}
                                                    className="flex items-center"
                                                >
                                                    <Share2 className="mr-2 h-4 w-4" />
                                                    Share
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
