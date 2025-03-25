'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {

  return (
	<div className={"p-4 md:p-16"}>
		<div className={'w-full h-full border-2 border-red-500'}>
			<h1>Hello</h1>
		</div>
	</div>
  )
}
