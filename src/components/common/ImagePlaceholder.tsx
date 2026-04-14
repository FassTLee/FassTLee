'use client'

interface ImagePlaceholderProps {
  width?: number
  height?: number
  label?: string
  className?: string
}

export function ImagePlaceholder({
  width = 800,
  height = 600,
  label = '이미지 준비중',
  className = '',
}: ImagePlaceholderProps) {
  const aspect = height / width
  return (
    <div
      className={`w-full bg-[#F5F5F3] border-2 border-dashed border-[#CCCCCC] rounded-lg flex flex-col items-center justify-center ${className}`}
      style={{ paddingBottom: `${aspect * 100}%`, position: 'relative' }}
    >
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1"
      >
        <div className="text-[28px] opacity-30">🖼</div>
        <span className="text-[12px] text-[#ADADAD] font-medium">[{label}]</span>
        <span className="text-[10px] text-[#CCCCCC]">{width} × {height}</span>
      </div>
    </div>
  )
}
