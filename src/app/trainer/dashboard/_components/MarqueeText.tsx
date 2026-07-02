'use client'

import { useState, useEffect, useRef } from 'react'

// 텍스트 폭 100px당 걸리는 시간(초) — 폭에 비례해 duration을 늘려 이동 속도(px/sec)를
// 텍스트 길이와 무관하게 일정하게 유지한다. w-max 적용 후 이동 거리가 텍스트 실제
// 폭만큼 늘었는데 duration이 고정(4s)이면 길수록 더 빨리 스크롤되는 것처럼 보이는
// 문제를 방지.
const SECONDS_PER_100PX = 3
const MIN_DURATION_SEC  = 2

export function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  const [textWidth, setTextWidth] = useState(0)

  useEffect(() => {
    const measure = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx && containerRef.current) {
        const style = window.getComputedStyle(containerRef.current)
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const measuredWidth = ctx.measureText(text).width
        const containerWidth = containerRef.current.clientWidth
        setTextWidth(measuredWidth)
        setOverflow(measuredWidth > containerWidth)
      }
    }
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure)
    })
    return () => cancelAnimationFrame(raf)
  }, [text])

  const duration = Math.max(MIN_DURATION_SEC, (textWidth / 100) * SECONDS_PER_100PX)

  return (
    <div ref={containerRef} className="overflow-hidden max-w-[120px]">
      {overflow ? (
        <div
          className="flex w-max animate-marquee whitespace-nowrap"
          style={{ animationDuration: `${duration}s` }}
        >
          <span className={`${className ?? ''} shrink-0`}>{text}&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span className={`${className ?? ''} shrink-0`}>{text}&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      ) : (
        <span className={className}>{text}</span>
      )}
    </div>
  )
}
