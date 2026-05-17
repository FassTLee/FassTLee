'use client'

import { useEffect, useRef } from 'react'

interface Props {
  unit: string
  width: number
  height: number
}

export function KakaoAdFit({ unit, width, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ins = document.createElement('ins')
    ins.className = 'kakao_ad_area'
    ins.style.display = 'none'
    ins.setAttribute('data-ad-unit', unit)
    ins.setAttribute('data-ad-width', String(width))
    ins.setAttribute('data-ad-height', String(height))
    container.appendChild(ins)

    const script = document.createElement('script')
    script.src = '//t1.kakaocdn.net/kas/static/ba.min.js'
    script.async = true
    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [unit, width, height])

  return <div ref={containerRef} style={{ width, height }} />
}
