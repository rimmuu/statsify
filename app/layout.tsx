import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import Shell from '@/components/Shell'

export const metadata: Metadata = {
  title: 'Statsify — Personal Music Archive',
  description: 'Private cinematic listening analytics by Rimmuu. Explore your music archive, 3D vinyl collection, insights, and Wrapped film.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Statsify',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#080808' },
    { media: '(prefers-color-scheme: light)', color: '#080808' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
