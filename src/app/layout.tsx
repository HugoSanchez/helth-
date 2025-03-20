import type { Metadata } from 'next'
import { Roboto_Serif, Roboto_Flex, Work_Sans } from 'next/font/google'
import './globals.css'
import SupabaseProvider from '../components/providers/SupabaseProvider'

const robotoSerif = Roboto_Serif({ subsets: ['latin'], weight: ['200', '300', '400', '500', '600', '700'], variable: '--font-roboto-serif' })
const robotoFlex = Roboto_Flex({ subsets: ['latin'], weight: ['200', '300', '400', '500', '600', '700'],variable: '--font-roboto-flex' })
const workSans = Work_Sans({ subsets: ['latin'], weight: ['200', '300', '400', '500', '600', '700'], variable: '--font-work-sans' })
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
			<body className={`${robotoFlex.variable} ${robotoSerif.variable} ${workSans.variable}`}>
				<SupabaseProvider>
					{children}
				</SupabaseProvider>
			</body>
		</html>
	)
}
