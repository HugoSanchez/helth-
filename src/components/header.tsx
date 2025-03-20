'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Helth.</h1>
				<DropdownMenu>
				<DropdownMenuTrigger>
					<Avatar>
					<AvatarFallback>U</AvatarFallback>
					</Avatar>
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
