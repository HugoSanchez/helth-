import type { Metadata } from 'next'
import { Roboto_Serif, Roboto_Flex } from 'next/font/google'
import './globals.css'
import SupabaseProvider from '../components/providers/SupabaseProvider'

const robotoSerif = Roboto_Serif({ subsets: ['latin'], variable: '--font-roboto-serif' })
const robotoFlex = Roboto_Flex({ subsets: ['latin'], variable: '--font-roboto-flex' })

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
			<body className={`${robotoFlex.variable} ${robotoSerif.variable}`}>
				<SupabaseProvider>
					{children}
				</SupabaseProvider>
			</body>
		</html>
	)
}
