'use client'

import { useEffect, useRef } from 'react'
import { PROTECTED_IMAGE_STYLE } from '@/lib/contentProtection'

interface ProtectedImageProps {
  src: string
  alt: string
  caption?: string
  watermark?: string
  className?: string
  width?: number
  height?: number
}

/**
 * 해부학 이미지 보호 컴포넌트
 * - 우클릭 방지
 * - 드래그 방지
 * - CSS pointer-events 차단
 * - Canvas 워터마크 자동 삽입
 */
export function ProtectedImage({
  src,
  alt,
  caption,
  watermark = 'FassT © 2026',
  className = '',
  width,
  height,
}: ProtectedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      ctx.drawImage(img, 0, 0)

      // 보이지 않는 워터마크 (opacity 3%)
      ctx.save()
      ctx.globalAlpha = 0.03
      ctx.fillStyle = '#000000'
      const fontSize = Math.max(14, Math.floor(canvas.width / 25))
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'

      const cols = 3
      const rows = 3
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = (canvas.width / cols) * (c + 0.5)
          const y = (canvas.height / rows) * (r + 0.5)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(-Math.PI / 6)
          ctx.fillText(watermark, 0, 0)
          ctx.restore()
        }
      }
      ctx.restore()
    }

    img.onerror = () => {
      // 이미지 로드 실패 시 플레이스홀더 표시
      ctx.fillStyle = '#F5F5F3'
      ctx.fillRect(0, 0, canvas.width || 400, canvas.height || 300)
      ctx.fillStyle = '#ADADAD'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('[이미지 준비중]', (canvas.width || 400) / 2, (canvas.height || 300) / 2)
    }

    img.src = src
  }, [src, watermark])

  return (
    <div
      ref={containerRef}
      data-protected="true"
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={width ?? 600}
        height={height ?? 400}
        className="w-full h-auto block"
        style={PROTECTED_IMAGE_STYLE}
        aria-label={alt}
        role="img"
      />
      {/* Invisible overlay — prevents right-click save */}
      <div
        className="absolute inset-0"
        style={{
          background: 'transparent',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      {caption && (
        <div className="bg-[#F5F5F3] px-3 py-2 text-[11px] text-[#6B6B6B] text-center">
          {caption}
        </div>
      )}
    </div>
  )
}
