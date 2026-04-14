'use client'

import { Wifi, Battery, Signal } from 'lucide-react'

export function StatusBar() {
  const now = new Date()
  const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div
      className="flex items-center justify-between px-6 pt-1 bg-white"
      style={{ height: '44px', paddingTop: '30px' }}
    >
      <span className="text-[13px] font-semibold text-[#1A1A1A]">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal size={14} className="text-[#1A1A1A]" />
        <Wifi size={14} className="text-[#1A1A1A]" />
        <Battery size={14} className="text-[#1A1A1A]" />
      </div>
    </div>
  )
}
