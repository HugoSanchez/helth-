import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '../app/providers'
import SupabaseProvider from '../components/supabase-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Health Records Manager',
  description: 'Automatically organize your health records from Gmail',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SupabaseProvider>
          <Providers>{children}</Providers>
        </SupabaseProvider>
      </body>
    </html>
  )
}
