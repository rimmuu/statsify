import './globals.css'
import type { Metadata, Viewport } from 'next'
import Shell from '@/components/Shell'

export const metadata: Metadata = { title: 'Statsify by Rimmuu', description: 'Private Spotify listening analytics' }
export const viewport: Viewport = { themeColor: '#0B0B0B', viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
