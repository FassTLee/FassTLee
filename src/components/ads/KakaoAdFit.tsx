'use client'

import { useEffect, useRef } from 'react'

interface Props {
  unit: string
  width: number
  height: number
}

export function KakaoAdFit({ unit, width, height }: Props) {
  const insRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    // SPA 네비게이션 후 AdFit이 새 ins 요소를 인식하도록 스크립트를 재주입.
    // 브라우저가 URL을 캐시하므로 추가 네트워크 비용 없음.
    const ins = insRef.current
    if (!ins) return

    const script = document.createElement('script')
    script.src = '//t1.kakaocdn.net/kas/static/ba.min.js'
    script.async = true
    ins.parentNode?.insertBefore(script, ins.nextSibling)

    return () => {
      script.remove()
    }
  }, [unit])

  return (
    <ins
      ref={insRef}
      className="kakao_ad_area"
      style={{ display: 'none' }}
      data-ad-unit={unit}
      data-ad-width={String(width)}
      data-ad-height={String(height)}
    />
  )
}
