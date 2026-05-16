'use client'

import { useState, useCallback } from 'react'

interface SharePanelProps {
  score:   number
  total:   number
  pct:     number
  variant: 'landing' | 'exam'
}

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean
      init: (key: string) => void
      Share: {
        sendDefault: (opts: object) => void
      }
    }
  }
}

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakaojs/sdk/2.7.4/kakao.min.js'
const SITE_URL      = 'https://kinepia.com'

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Kakao) { resolve(); return }
    const s  = document.createElement('script')
    s.src    = KAKAO_SDK_URL
    s.crossOrigin = 'anonymous'
    s.onload = () => resolve()
    s.onerror = () => resolve()  // resolve anyway; share will silently fail
    document.head.appendChild(s)
  })
}

export function SharePanel({ score, total, pct, variant }: SharePanelProps) {
  const [copied, setCopied] = useState(false)

  const shareText = variant === 'landing'
    ? `${pct}점! 건강운동관리사 모의 테스트 해봤어요! ${SITE_URL}`
    : `${pct}점! 건강운동관리사 모의고사 결과! ${SITE_URL}`

  /* ── 카카오톡 공유 ─────────────────────────────────────────── */
  const shareKakao = useCallback(async () => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (!kakaoKey) {
      console.warn('[SharePanel] NEXT_PUBLIC_KAKAO_JS_KEY 미설정')
      return
    }
    await loadKakaoSDK()
    const K = window.Kakao
    if (!K) return
    if (!K.isInitialized()) K.init(kakaoKey)
    K.Share.sendDefault({
      objectType: 'text',
      text:        shareText,
      link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
    })
  }, [shareText])

  /* ── 인스타그램용 이미지 저장 (canvas) ──────────────────────── */
  const saveImage = useCallback(() => {
    const SIZE = 1080
    const canvas = document.createElement('canvas')
    canvas.width  = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#1A1A1A'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Subtle green glow
    const grd = ctx.createRadialGradient(540, 420, 0, 540, 420, 340)
    grd.addColorStop(0, 'rgba(0,166,81,0.18)')
    grd.addColorStop(1, 'rgba(0,166,81,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Emoji
    ctx.font      = '130px serif'
    ctx.textAlign = 'center'
    ctx.fillText(pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📖', 540, 290)

    // Score %
    ctx.font      = 'bold 220px Arial, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(`${pct}%`, 540, 560)

    // Sub score
    ctx.font      = '50px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(`${score} / ${total} 정답`, 540, 640)

    // Title
    const title = variant === 'landing'
      ? '건강운동관리사 모의 테스트'
      : '건강운동관리사 모의고사'
    ctx.font      = 'bold 54px Arial, sans-serif'
    ctx.fillStyle = '#00A651'
    ctx.fillText(title, 540, 760)

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(180, 840)
    ctx.lineTo(900, 840)
    ctx.stroke()

    // Brand
    ctx.font      = 'bold 38px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('kinepia.com', 540, 930)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = 'kinepia-result.png'
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [pct, score, total, variant])

  /* ── 링크 복사 ───────────────────────────────────────────────── */
  const copyLink = useCallback(async () => {
    const text = shareText
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      Object.assign(el.style, { position: 'fixed', opacity: '0' })
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareText])

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
      <p className="text-[13px] font-bold text-[#1A1A1A] mb-3">결과 공유하기 ✨</p>
      <div className="grid grid-cols-3 gap-2.5">

        {/* 카카오톡 */}
        <button
          onClick={shareKakao}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl active:opacity-80 transition-opacity"
          style={{ backgroundColor: '#FEE500' }}
        >
          <svg width="26" height="26" viewBox="0 0 512 512" fill="#1A1A1A">
            <path d="M256 32C114.6 32 0 125.1 0 240c0 72.3 45.3 136 114.3 174.6-4.9 18.1-18.2 65.4-20.9 75.7-.3.9-.6 2.1.3 2.9.9.8 2 .4 2 .4 2.6-.4 105.5-69.4 115.3-76.1C219.9 419.5 237.7 421 256 421c141.4 0 256-93.1 256-208S397.4 32 256 32z"/>
          </svg>
          <span className="text-[11px] font-bold text-[#1A1A1A] leading-tight text-center">카카오톡<br/>공유</span>
        </button>

        {/* 이미지 저장 */}
        <button
          onClick={saveImage}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl active:opacity-80 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #F77737 100%)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5"/>
            <circle cx="12" cy="12" r="3"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="white" stroke="none"/>
          </svg>
          <span className="text-[11px] font-bold text-white leading-tight text-center">이미지<br/>저장</span>
        </button>

        {/* 링크 복사 */}
        <button
          onClick={copyLink}
          className={`flex flex-col items-center gap-2 py-4 rounded-2xl active:opacity-80 transition-colors ${
            copied ? 'bg-[#00A651]' : 'bg-[#F5F5F3]'
          }`}
        >
          {copied ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          )}
          <span className={`text-[11px] font-bold leading-tight text-center ${copied ? 'text-white' : 'text-[#1A1A1A]'}`}>
            {copied ? '복사됨!' : '링크\n복사'}
          </span>
        </button>

      </div>
    </div>
  )
}
