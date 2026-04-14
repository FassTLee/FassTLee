import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FassT',
  description: 'Fitness + Study + Session + Training — 트레이너 전문 교육 플랫폼',
  applicationName: 'FassT',
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
      <body>{children}</body>
    </html>
  )
}
