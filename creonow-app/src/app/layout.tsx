import type { Metadata } from 'next'
import '@/styles/globals.css'
import { CnTooltipProvider } from '@/components/ui/cn-tooltip'

export const metadata: Metadata = {
  title: 'CreoNow',
  description: 'Agent-native creative writing IDE',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-cn-ui">
        <CnTooltipProvider>{children}</CnTooltipProvider>
      </body>
    </html>
  )
}
