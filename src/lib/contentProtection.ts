'use client'

// ================================================================
// 콘텐츠 보호 — 해부학 이미지 카피 방지
// ================================================================

/**
 * 이미지 우클릭 방지 + 드래그 방지
 */
export function initContentProtection() {
  if (typeof window === 'undefined') return

  // 우클릭 방지 (protected 이미지만)
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-protected]')) {
      e.preventDefault()
      return false
    }
  })

  // 드래그 방지
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-protected]')) {
      e.preventDefault()
      return false
    }
  })

  // 개발자도구 단축키 방지 (기본적인 억제)
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault()
    }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
      e.preventDefault()
    }
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault()
    }
    // Ctrl+S (저장 방지)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
    }
  })

  // 텍스트 선택 방지 (protected 영역)
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-protected]')) {
      e.preventDefault()
    }
  })
}

/**
 * Canvas 워터마크 삽입
 * 이미지 URL을 받아 워터마크가 삽입된 DataURL 반환
 */
export async function applyWatermark(
  imageUrl: string,
  watermarkText: string = 'FassT © 2026'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(imageUrl); return }

      // Draw original image
      ctx.drawImage(img, 0, 0)

      // Invisible watermark (very low opacity)
      ctx.save()
      ctx.globalAlpha = 0.04
      ctx.fillStyle = '#1A1A1A'
      ctx.font = `${Math.max(12, img.width / 30)}px sans-serif`
      ctx.textAlign = 'center'

      // Tiled watermark
      const step = img.width / 3
      for (let x = step / 2; x < img.width; x += step) {
        for (let y = step / 2; y < img.height; y += step) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(-Math.PI / 6)
          ctx.fillText(watermarkText, 0, 0)
          ctx.restore()
        }
      }
      ctx.restore()

      resolve(canvas.toDataURL('image/png', 0.95))
    }
    img.onerror = () => resolve(imageUrl)
    img.src = imageUrl
  })
}

/**
 * 보호된 이미지 컴포넌트용 스타일
 */
export const PROTECTED_IMAGE_STYLE: React.CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}
