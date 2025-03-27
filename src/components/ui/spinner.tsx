import { cn } from "@/lib/client/utils"

interface SpinnerProps {
    className?: string
    size?: "sm" | "md" | "lg"
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4"
    }

    return (
        <div role="status" className="relative">
            <div
                className={cn(
                    "animate-spin rounded-full border-black",
                    "border-black",
                    sizeClasses[size],
                    className
                )}
            />
            <span className="sr-only">Loading...</span>
        </div>
    )
}
