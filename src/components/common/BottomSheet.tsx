'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  fullHeight?: boolean
}

export function BottomSheet({ open, onClose, title, children, fullHeight = false }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`relative bg-white rounded-t-[20px] flex flex-col ${fullHeight ? 'max-h-[85%]' : 'max-h-[70%]'}`}
        style={{ minHeight: '200px' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
        </div>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-[#E5E5E5]">
            <span className="text-[16px] font-semibold text-[#1A1A1A]">{title}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
              <X size={18} className="text-[#6B6B6B]" />
            </button>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 overflow-y-auto touch-scroll px-4 py-2 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}
