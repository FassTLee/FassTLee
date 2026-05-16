'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ALL_VIDEOS } from '@/lib/videos'

export default function VideosPage() {
  const router = useRouter()
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const handleTap = useCallback((i: number) => {
    const vid = videoRefs.current[i]
    if (!vid) return

    if (playingIdx === i) {
      if (vid.paused) { vid.play().catch(() => {}) } else { vid.pause() }
      return
    }

    // 다른 영상 정지
    videoRefs.current.forEach((v, idx) => {
      if (v && idx !== i) { v.pause(); v.currentTime = 0 }
    })

    setPlayingIdx(i)
    vid.currentTime = 0
    vid.play().catch(() => {})
  }, [playingIdx])

  return (
    <div className="min-h-screen bg-[#F5F5F3]">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E5] px-4 pt-12 pb-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full active:bg-[#F5F5F3]"
        >
          <ChevronLeft size={22} className="text-[#1A1A1A]" />
        </button>
        <div>
          <h1 className="text-[17px] font-black text-[#1A1A1A]">추천 영상</h1>
          <p className="text-[11px] text-[#ADADAD]">전체 {ALL_VIDEOS.length}개</p>
        </div>
      </div>

      {/* 영상 목록 */}
      <div className="p-4 space-y-4 pb-12">
        {ALL_VIDEOS.map((vid, i) => {
          const isPlaying = playingIdx === i
          return (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden border border-[#E5E5E5] active:opacity-90 cursor-pointer"
              onClick={() => handleTap(i)}
            >
              {/* 비디오 */}
              <div className="relative bg-[#1A1A1A]" style={{ aspectRatio: '9 / 11' }}>
                <video
                  ref={(el) => { videoRefs.current[i] = el }}
                  src={vid.src}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  preload="metadata"
                  loop
                  onLoadedMetadata={(e) => {
                    const v = e.target as HTMLVideoElement
                    v.currentTime = 0.001
                  }}
                />

                {/* 정지 오버레이 */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 via-transparent to-black/50 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-[#00A651]/90 flex items-center justify-center shadow-xl">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <polygon points="8,3 22,12 8,21" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 재생 중 인디케이터 */}
                {isPlaying && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#00A651] px-2.5 py-1 rounded-full pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-[10px] font-bold">재생 중</span>
                  </div>
                )}

                {/* 녹색 테두리 */}
                {isPlaying && (
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-[#00A651] pointer-events-none" />
                )}
              </div>

              {/* 카드 정보 */}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isPlaying ? 'bg-[#00A651]/15' : 'bg-[#F5F5F3]'
                }`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isPlaying ? '#00A651' : '#ADADAD'}>
                    <polygon points="8,3 22,12 8,21" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1A1A1A] truncate">{vid.title}</p>
                  <p className="text-[12px] text-[#ADADAD] truncate mt-0.5">{vid.desc}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-[#F5F5F3] text-[#6B6B6B]">
                  {i + 1} / {ALL_VIDEOS.length}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
