'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabase"

export function ConnectGmail() {
  const router = useRouter()

  const handleConnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI

      const scope = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
      ].join(' ')

      // Include the Supabase access token in the state
      const state = btoa(session.access_token)

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`

      window.location.href = authUrl
    } catch (error) {
      console.error('Error initiating Gmail connection:', error)
      router.push('/login')
    }
  }

  return (
    <Button onClick={handleConnect} variant="outline">
      Connect Gmail
    </Button>
  )
}
