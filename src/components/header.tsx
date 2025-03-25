'use client'

import { useRouter } from 'next/navigation'
import { Menu } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"

export function Header() {
	const router = useRouter()

	const handleSignOut = async () => {
		await supabase.auth.signOut()
		router.replace('/login')
	}

	return (
		<header className="">
			<div className="px-4 sm:px-6 lg:px-16 h-14 flex items-center justify-between">
				<h1 className="text-xl font-bold font-serif">helth.</h1>
				<DropdownMenu>
				<DropdownMenuTrigger>
					<Menu className="h-5 w-5 text-muted-foreground" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
					className="cursor-pointer"
					onClick={handleSignOut}
					>
					Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	)
}
