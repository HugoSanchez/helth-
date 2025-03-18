'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'

export function ConnectGmail() {
  const router = useRouter()

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI

    const scope = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ].join(' ')

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`

    window.location.href = authUrl
  }

  return (
    <Button onClick={handleConnect} variant="outline">
      Connect Gmail
    </Button>
  )
}
