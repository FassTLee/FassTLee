'use client'

import { ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
  className?: string
}

export function PhoneFrame({ children, className = '' }: PhoneFrameProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div
        className={`relative bg-white overflow-hidden shadow-2xl ${className}`}
        style={{
          width: '375px',
          minHeight: '812px',
          maxWidth: '100vw',
          borderRadius: '40px',
          border: '10px solid #1A1A1A',
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A]"
          style={{ width: '120px', height: '30px', borderRadius: '0 0 16px 16px' }}
        />
        {children}
      </div>
    </div>
  )
}
