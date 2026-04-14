'use client'

interface ProgressStripProps {
  current: number
  total: number
}

export function ProgressStrip({ current, total }: ProgressStripProps) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full bg-[#E5E5E5]" style={{ height: '3px' }}>
      <div
        className="h-full bg-[#E24B4A] transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
