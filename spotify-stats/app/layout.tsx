import './globals.css'
import type { Metadata, Viewport } from 'next'
import Shell from '@/components/Shell'

export const metadata: Metadata = { title: 'Statsify', description: 'Private Spotify listening analytics' }
export const viewport: Viewport = { themeColor: '#0a0a0a' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
