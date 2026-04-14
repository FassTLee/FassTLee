'use client'

import { ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title: string
  leftAction?: ReactNode | 'back' | 'close'
  rightAction?: ReactNode
  onBack?: () => void
}

export function Header({ title, leftAction = 'back', rightAction, onBack }: HeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) onBack()
    else router.back()
  }

  const renderLeft = () => {
    if (leftAction === 'back') {
      return (
        <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-[#1A1A1A]" />
        </button>
      )
    }
    if (leftAction === 'close') {
      return (
        <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center">
          <X size={20} className="text-[#1A1A1A]" />
        </button>
      )
    }
    return leftAction || <div className="w-8" />
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E5E5]">
      <div className="w-8">{renderLeft()}</div>
      <h1 className="text-[16px] font-semibold text-[#1A1A1A] flex-1 text-center">{title}</h1>
      <div className="w-8 flex justify-end">{rightAction || null}</div>
    </div>
  )
}
