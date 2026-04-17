import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Kinepia',
  description: '움직임의 원리를 배우는 지식 플랫폼',
  applicationName: 'Kinepia',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
