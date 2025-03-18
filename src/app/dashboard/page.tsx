'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ConnectGmail } from '@/components/connect-gmail'

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasGmailConnection, setHasGmailConnection] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        // Check if user has Gmail connection
        const { data: credentials } = await supabase
          .from('gmail_credentials')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        setHasGmailConnection(!!credentials)
      } catch (error) {
        console.error('Error checking session:', error)
        router.replace('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Health Records</h2>
        {!hasGmailConnection && <ConnectGmail />}
      </div>
      <p className="text-gray-600">
        {hasGmailConnection
          ? "Your Gmail account is connected. We'll start scanning for health records."
          : "Connect your Gmail account to start scanning for health records."}
      </p>
    </div>
  )
}
