'use client'

import { useState, useEffect, useRef } from 'react'

export function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const measure = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx && containerRef.current) {
        const style = window.getComputedStyle(containerRef.current)
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const textWidth = ctx.measureText(text).width
        const containerWidth = containerRef.current.clientWidth
        setOverflow(textWidth > containerWidth)
      }
    }
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure)
    })
    return () => cancelAnimationFrame(raf)
  }, [text])

  return (
    <div ref={containerRef} className="overflow-hidden max-w-[120px]">
      {overflow ? (
        <div className="flex animate-marquee whitespace-nowrap">
          <span className={className}>{text}&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span className={className}>{text}&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      ) : (
        <span className={className}>{text}</span>
      )}
    </div>
  )
}
