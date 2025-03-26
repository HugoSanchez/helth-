import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export interface BreadcrumbStep {
  label: string
  active: boolean
  completed: boolean
  onClick?: () => void
}

interface BreadcrumbProps {
  steps: BreadcrumbStep[]
  className?: string
}

export function Breadcrumb({ steps, className }: BreadcrumbProps) {
	return (
		<nav className={cn("flex items-center space-x-1 text-sm", className)}>
			{steps.map((step, index) => (
				<React.Fragment key={step.label}>
				<div
					className={cn(
						"px-2 py-1 rounded-md transition-colors",
						step.active && "bg-teal-100 text-black",
						step.completed && "bg-[#F5F1ED] text-black hover:bg-[#E6DDD4] cursor-pointer",
						!step.active && !step.completed && "text-muted-foreground"
					)}
					onClick={step.onClick}
					role={step.onClick ? "button" : undefined}
				>
					{step.label}
				</div>
				{index < steps.length - 1 && (
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
				)}
				</React.Fragment>
			))}
		</nav>
	)
}
