'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/client/supabase'

export default function Home() {
	const router = useRouter()

	const handleClick = async () => {
		const { data: { session } } = await supabase.auth.getSession()
		if (session) {
			router.push('/dashboard')
		} else {
			router.push('/login')
		}
	}

  return (
	<div className={"p-4 md:p-16"}>
		<div className={'w-full h-full mt-24 '}>
			<h1 className={'text-6xl md:text-7xl font-bold font-serif'}>Take control of</h1>
			<h1 className={'text-6xl md:text-7xl font-bold font-serif'}>your health records<span className={'text-teal-200'}>.</span></h1>
			<p className={'text-xl md:text-2xl mt-12 leading-relaxed font-light md:max-w-3xl'}>
				<span className={'bg-teal-200 font-serif mr-2'}>Automatically organize all your health records.</span>
				Make it easy for professionals to access your data, and interact with an AI that has
				your full medical history <span className={'bg-orange-200'}>while always being in control.</span>
			</p>
			<div className={'mt-12'}>

				<button
					onClick={handleClick}
					className={'bg-black text-white font-serif px-6 py-3 rounded-md shadow-md hover:opacity-80'}>
						Get started today!
				</button>
			</div>
		</div>
	</div>
  )
}
