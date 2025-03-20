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

interface UploadDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function UploadDrawer({ isOpen, onClose }: UploadDrawerProps) {
    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            direction="right"
        >
            <DrawerContent side="right">
                <DrawerHeader>
                    <div className="flex items-center justify-between">
                        <DrawerTitle>Upload Medical Document</DrawerTitle>
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
                <div className="flex-1 overflow-y-auto">
                    {/* Form will go here */}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
