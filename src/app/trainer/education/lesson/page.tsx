'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Play, Pause, Volume2 } from 'lucide-react'
import { LessonNavigator, NAVIGATOR_DATA, type NavigatorPosition } from '@/components/common/LessonNavigator'

// ================================================================
// 더미 데이터 (DB 연결 전)
// ================================================================

interface SlideData {
  imageLabel: string
  imageSub: string
  imageBg: string
  audioTime: string
  title: string
  checkboxes: string[]
}

const DUMMY_LESSON = {
  subject: '기능 해부학',
  chapter: '기시·정지 이해',
  lesson: '대퇴직근 기시·정지',
  slides: [
    {
      imageLabel: '대퇴직근 전체 위치',
      imageSub: '전체 개요',
      imageBg: '#EBF4FF',
      audioTime: '0:23',
      title: '슬라이드 1 — 전체 개요',
      checkboxes: [
        '대퇴직근(Rectus Femoris)은 대퇴사두근의 하나',
        '유일하게 고관절과 슬관절을 동시에 지나는 이중관절근',
        '트레이너가 가장 자주 다루는 핵심 근육',
        '교차증후군에서 단축근(Tight)으로 분류',
      ],
    },
    {
      imageLabel: '기시점(Origin) 표시',
      imageSub: '위치 상세',
      imageBg: '#F0FFF4',
      audioTime: '0:18',
      title: '슬라이드 2 — 위치',
      checkboxes: [
        '기시(Origin): 전하장골극 AIIS',
        '정지(Insertion): 슬개골 상단',
        '대퇴 전면 중앙부에 위치',
      ],
    },
    {
      imageLabel: '근육 수축 방향',
      imageSub: '기능·작용',
      imageBg: '#FFF9E6',
      audioTime: '0:21',
      title: '슬라이드 3 — 기능·작용',
      checkboxes: [
        '주작용: 슬관절 신전 (무릎 펴기)',
        '보조작용: 고관절 굴곡 (다리 들기)',
        '신경 지배: 대퇴신경 L2–L4',
        'Tonic 근육으로 단축 경향',
      ],
    },
    {
      imageLabel: '단축 시 교차증후군',
      imageSub: '임상 적용',
      imageBg: '#FFF0F0',
      audioTime: '0:25',
      title: '슬라이드 4 — 임상 적용',
      checkboxes: [
        '단축 시 → 전방 골반 경사 유발',
        'LCS(하지 교차증후군) Tight 근육',
        '마사지 후 스트레칭 순서 중요',
        'Thomas Test로 단축 여부 평가',
      ],
    },
  ] as SlideData[],
}

// ================================================================
// 오디오 플레이어 플레이스홀더
// ================================================================

function AudioBar({ audioTime, isPlaying, onToggle }: { audioTime: string; isPlaying: boolean; onToggle: () => void }) {
  const bars = [3, 6, 9, 7, 4, 8, 5, 10, 6, 3, 7, 9, 4, 6, 8, 5, 3, 7, 6, 4]
  return (
    <div className="flex items-center gap-3 bg-[#F8F8F8] rounded-xl px-3 py-2.5">
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-full bg-[#378ADD] flex items-center justify-center flex-shrink-0 active:opacity-80"
      >
        {isPlaying
          ? <Pause size={14} className="text-white" />
          : <Play size={14} className="text-white ml-0.5" />
        }
      </button>
      {/* 파형 애니메이션 */}
      <div className="flex items-center gap-[2px] flex-1 h-6">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all"
            style={{
              height: `${isPlaying ? h * 2 : 4}px`,
              backgroundColor: isPlaying ? '#378ADD' : '#CCCCCC',
              animation: isPlaying ? `wave ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate` : 'none',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Volume2 size={11} className="text-[#ADADAD]" />
        <span className="text-[11px] text-[#6B6B6B] font-mono">{audioTime}</span>
      </div>
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

// ================================================================
// 메인 레슨 페이지
// ================================================================

export default function LessonPage() {
  const router = useRouter()

  // ── 슬라이드 상태 ────────────────────────────────────────────
  const [slide, setSlide] = useState(0)
  const totalSlides = DUMMY_LESSON.slides.length
  const current = DUMMY_LESSON.slides[slide]

  // ── 체크박스 상태 ─────────────────────────────────────────────
  const [checked, setChecked] = useState<boolean[][]>(
    DUMMY_LESSON.slides.map((s) => Array(s.checkboxes.length).fill(false))
  )

  // ── 모드 (manual / auto) ─────────────────────────────────────
  const [mode, setMode] = useState<'manual' | 'auto'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kinepia_lesson_mode') as 'manual' | 'auto') ?? 'manual'
    }
    return 'manual'
  })
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showFirstVisitPopup, setShowFirstVisitPopup] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // ── 오디오 플레이스홀더 ────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)

  // ── 미완료 팝업 ───────────────────────────────────────────────
  const [showIncompletePopup, setShowIncompletePopup] = useState(false)
  const [pendingSlide, setPendingSlide] = useState<number | null>(null)

  // ── 네비게이터 ────────────────────────────────────────────────
  const [showNavigator, setShowNavigator] = useState(false)
  const [navPos, setNavPos] = useState<NavigatorPosition>({
    subjectId: 'functional',
    chapterId: 'func-c1',
    lessonId: 'func-c1-l1',
  })
  const [selSubject, setSelSubject] = useState('functional')
  const [selChapter, setSelChapter] = useState('func-c1')
  const [selLesson, setSelLesson] = useState('func-c1-l1')

  // ── 드래그/스와이프 상태 ─────────────────────────────────────
  const dragStartX = useRef<number | null>(null)
  const dragCurrentX = useRef<number>(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDragging = useRef(false)
  const slideAreaRef = useRef<HTMLDivElement>(null)

  // ── 첫 방문 팝업 ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem('kinepia_lesson_mode_seen')
    if (!seen) setShowFirstVisitPopup(true)
  }, [])

  const handleModeChange = (m: 'manual' | 'auto') => {
    setMode(m)
    if (typeof window !== 'undefined') localStorage.setItem('kinepia_lesson_mode', m)
    setShowModeDropdown(false)
    setIsPlaying(false)
  }

  // ── 슬라이드 이동 로직 ────────────────────────────────────────
  const allChecked = checked[slide].every(Boolean)

  const tryGoToSlide = useCallback((target: number) => {
    if (target < 0 || target >= totalSlides) return
    if (mode === 'manual' && !allChecked && target !== slide) {
      setPendingSlide(target)
      setShowIncompletePopup(true)
    } else {
      setSlide(target)
      setIsPlaying(false)
    }
  }, [slide, totalSlides, mode, allChecked])

  // ── 드래그 핸들러 (마우스) ────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX
    isDragging.current = true
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || dragStartX.current === null) return
    const delta = e.clientX - dragStartX.current
    dragCurrentX.current = delta
    setDragOffset(delta)
  }
  const onMouseUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = dragCurrentX.current
    setDragOffset(0)
    dragStartX.current = null
    if (delta < -50) tryGoToSlide(slide + 1)
    else if (delta > 50) tryGoToSlide(slide - 1)
  }

  // ── 드래그 핸들러 (터치) ─────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX
    isDragging.current = true
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || dragStartX.current === null) return
    const delta = e.touches[0].clientX - dragStartX.current
    dragCurrentX.current = delta
    setDragOffset(delta)
  }
  const onTouchEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = dragCurrentX.current
    setDragOffset(0)
    dragStartX.current = null
    if (delta < -50) tryGoToSlide(slide + 1)
    else if (delta > 50) tryGoToSlide(slide - 1)
  }

  // ── 자동 모드: 음성 완료 후 다음 슬라이드 (placeholder) ───────
  useEffect(() => {
    if (mode !== 'auto' || !isPlaying) return
    const audioSeconds = parseInt(current.audioTime.split(':')[1] ?? '20')
    const timer = setTimeout(() => {
      setIsPlaying(false)
      if (slide < totalSlides - 1) setSlide((s) => s + 1)
    }, (audioSeconds + 1) * 1000)
    return () => clearTimeout(timer)
  }, [mode, isPlaying, slide, current.audioTime, totalSlides])

  const pct = Math.round(((slide + 1) / totalSlides) * 100)

  const checkedCount = checked[slide].filter(Boolean).length
  const firstUncheckedIdx = checked[slide].findIndex((v) => !v)

  // ── ref for scrolling to first unchecked ─────────────────────
  const checkboxRefs = useRef<(HTMLDivElement | null)[]>([])

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ════════════════════════════════════════════════════════
          헤더
      ════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center gap-2 sticky top-0 z-20">
        {/* 뒤로 */}
        <button
          onClick={() => router.push('/trainer/education')}
          className="flex items-center gap-0.5 text-[13px] text-[#6B6B6B] flex-shrink-0"
        >
          <ChevronLeft size={16} /> 뒤로
        </button>

        {/* 과목 제목 — 클릭 시 네비게이터 */}
        <button
          onClick={() => {
            setSelSubject(navPos.subjectId)
            setSelChapter(navPos.chapterId)
            setSelLesson(navPos.lessonId)
            setShowNavigator(true)
          }}
          className="flex-1 flex items-center justify-center gap-1 min-w-0"
        >
          <span className="text-[14px] font-bold text-[#1A1A1A] truncate">{DUMMY_LESSON.subject}</span>
          <ChevronDown size={14} className="text-[#6B6B6B] flex-shrink-0" />
        </button>

        {/* 우측: 모드 + 진행 */}
        <div className="flex items-center gap-2 flex-shrink-0 relative">
          <button
            onClick={() => setShowModeDropdown((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 bg-[#378ADD]/10 rounded-lg"
          >
            <span className="text-[11px] font-bold text-[#378ADD]">
              {mode === 'manual' ? '수동' : '자동'}
            </span>
            <ChevronDown size={11} className="text-[#378ADD]" />
          </button>
          {showModeDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-30 overflow-hidden w-24">
              {(['manual', 'auto'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`w-full px-3 py-2.5 text-left text-[12px] font-medium ${
                    mode === m ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'text-[#1A1A1A] hover:bg-[#F5F5F3]'
                  }`}
                >
                  {m === 'manual' ? '수동' : '자동'}
                </button>
              ))}
            </div>
          )}
          <span className="text-[11px] text-[#6B6B6B] font-medium">
            {slide + 1}/{totalSlides}
          </span>
        </div>
      </div>

      {/* ── 진행 바 ─────────────────────────────────────────────── */}
      <div className="h-1.5 bg-[#E5E5E5]">
        <div
          className="h-full bg-[#378ADD] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════
          슬라이드 영역 (드래그 가능)
      ════════════════════════════════════════════════════════ */}
      <div
        ref={slideAreaRef}
        className="flex-1 overflow-y-auto pb-24 select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="transition-transform duration-150"
          style={{ transform: `translateX(${Math.max(-80, Math.min(80, dragOffset))}px)` }}
        >

          {/* ── 이미지 영역 ─────────────────────────────────────── */}
          <div
            className="mx-4 mt-4 rounded-2xl overflow-hidden border border-[#E5E5E5]"
            style={{ backgroundColor: current.imageBg }}
          >
            <div className="flex flex-col items-center justify-center py-10 px-6 gap-3">
              <div className="text-[40px] opacity-30">🖼</div>
              <div className="text-[13px] font-semibold text-[#6B6B6B]">[{current.imageLabel}]</div>
              <div
                className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: NAVIGATOR_DATA.find((s) => s.id === navPos.subjectId)?.color ?? '#378ADD' }}
              >
                {current.imageSub}
              </div>
              <div className="text-[9px] text-[#ADADAD]">이미지 소스 확정 전 placeholder</div>
            </div>
          </div>

          {/* ── 동기화 라벨 ─────────────────────────────────────── */}
          <div className="mx-4 mt-2 flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-[#378ADD] animate-pulse" />
            <span className="text-[10px] text-[#378ADD] font-medium">↕ 이미지 + 텍스트 + 음성 동기화</span>
          </div>

          {/* ── 음성 재생 바 ─────────────────────────────────────── */}
          <div className="mx-4 mt-2">
            <AudioBar
              audioTime={current.audioTime}
              isPlaying={isPlaying}
              onToggle={() => setIsPlaying((v) => !v)}
            />
          </div>

          {/* ── 텍스트 + 체크박스 ────────────────────────────────── */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <div className="text-[13px] font-bold text-[#1A1A1A] mb-3">{current.title}</div>

            {mode === 'manual' ? (
              <div className="space-y-2.5">
                {current.checkboxes.map((text, i) => (
                  <div
                    key={i}
                    ref={(el) => { checkboxRefs.current[i] = el }}
                    onClick={() => {
                      const next = [...checked]
                      next[slide] = [...next[slide]]
                      next[slide][i] = !next[slide][i]
                      setChecked(next)
                    }}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    {/* 체크박스 */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      checked[slide][i]
                        ? 'bg-[#378ADD] border-[#378ADD]'
                        : 'border-[#CCCCCC] group-hover:border-[#378ADD]'
                    }`}>
                      {checked[slide][i] && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-[13px] leading-snug transition-all ${
                      checked[slide][i] ? 'line-through text-[#ADADAD]' : 'text-[#1A1A1A]'
                    }`}>
                      {text}
                    </span>
                  </div>
                ))}
                {/* 진행 표시 */}
                <div className="pt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[#F0F0EE] rounded-full">
                    <div
                      className="h-full rounded-full bg-[#378ADD] transition-all"
                      style={{ width: `${current.checkboxes.length > 0 ? (checkedCount / current.checkboxes.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#6B6B6B]">{checkedCount}/{current.checkboxes.length}</span>
                </div>
              </div>
            ) : (
              // 자동 모드: 체크박스 없이 텍스트만
              <ul className="space-y-2">
                {current.checkboxes.map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[#1A1A1A]">
                    <span className="text-[#378ADD] font-bold flex-shrink-0 mt-0.5">·</span>
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── 도트 네비게이션 ──────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 mt-5 mb-2">
            {DUMMY_LESSON.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => tryGoToSlide(i)}
                className={`rounded-full transition-all ${
                  i === slide
                    ? 'w-4 h-2 bg-[#378ADD]'
                    : 'w-2 h-2 bg-[#CCCCCC] hover:bg-[#ADADAD]'
                }`}
              />
            ))}
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          하단 푸터 (이전 / 다음)
      ════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white border-t border-[#E5E5E5] px-4 py-3 flex items-center gap-3 z-20" style={{ maxWidth: 430 }}>
        <button
          onClick={() => tryGoToSlide(slide - 1)}
          disabled={slide === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 border border-[#E5E5E5] rounded-2xl text-[14px] font-medium text-[#6B6B6B] disabled:opacity-30"
        >
          <ChevronLeft size={16} /> 이전
        </button>

        {slide < totalSlides - 1 ? (
          <button
            onClick={() => tryGoToSlide(slide + 1)}
            className="flex-[2] flex items-center justify-center gap-1.5 py-3.5 bg-[#378ADD] rounded-2xl text-[14px] font-bold text-white active:opacity-90"
          >
            다음 <span className="text-[16px]">›</span>
          </button>
        ) : (
          <button
            onClick={() => router.push('/trainer/education')}
            className="flex-[2] flex items-center justify-center gap-1.5 py-3.5 bg-[#639922] rounded-2xl text-[14px] font-bold text-white active:opacity-90"
          >
            ✅ 레슨 완료
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          미완료 체크박스 팝업
      ════════════════════════════════════════════════════════ */}
      {showIncompletePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-40 pb-6 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl">
            <div className="text-center mb-4">
              <div className="text-[32px] mb-2">📋</div>
              <h3 className="text-[16px] font-black text-[#1A1A1A] mb-1">모든 내용을 확인하지 않으셨습니다</h3>
              <p className="text-[12px] text-[#6B6B6B]">
                {checkedCount}/{current.checkboxes.length}개 확인 완료
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowIncompletePopup(false)
                  if (pendingSlide !== null) {
                    setSlide(pendingSlide)
                    setIsPlaying(false)
                    setPendingSlide(null)
                  }
                }}
                className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-[13px] font-medium text-[#6B6B6B]"
              >
                건너뛰기
              </button>
              <button
                onClick={() => {
                  setShowIncompletePopup(false)
                  setPendingSlide(null)
                  // 첫 번째 미체크 항목으로 스크롤
                  if (firstUncheckedIdx >= 0) {
                    checkboxRefs.current[firstUncheckedIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                className="flex-1 py-3 bg-[#378ADD] rounded-xl text-[13px] font-bold text-white"
              >
                확인하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          첫 방문 모드 안내 팝업
      ════════════════════════════════════════════════════════ */}
      {showFirstVisitPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center mb-5">
              <div className="text-[36px] mb-2">🎓</div>
              <h3 className="text-[18px] font-black text-[#1A1A1A] mb-2">학습 모드 선택</h3>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                <span className="font-bold text-[#1A1A1A]">수동 모드</span>: 체크박스로 학습 확인<br />
                <span className="font-bold text-[#1A1A1A]">자동 모드</span>: 음성 재생 후 자동 전환
              </p>
            </div>
            <div className="space-y-2 mb-4">
              {(['manual', 'auto'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`w-full py-3.5 rounded-2xl text-[14px] font-bold border-2 transition-all ${
                    mode === m
                      ? 'bg-[#378ADD] border-[#378ADD] text-white'
                      : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                  }`}
                >
                  {m === 'manual' ? '📝 수동 모드' : '▶ 자동 모드'}
                </button>
              ))}
            </div>
            <div
              onClick={() => setDontShowAgain((v) => !v)}
              className="flex items-center gap-2 mb-4 cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                dontShowAgain ? 'bg-[#378ADD] border-[#378ADD]' : 'border-[#CCCCCC]'
              }`}>
                {dontShowAgain && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-[#6B6B6B]">다시 보지 않기</span>
            </div>
            <button
              onClick={() => {
                if (dontShowAgain && typeof window !== 'undefined') {
                  localStorage.setItem('kinepia_lesson_mode_seen', '1')
                }
                setShowFirstVisitPopup(false)
              }}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          레슨 네비게이터
      ════════════════════════════════════════════════════════ */}
      <LessonNavigator
        open={showNavigator}
        current={navPos}
        onClose={() => setShowNavigator(false)}
        onNavigate={(pos) => {
          setNavPos(pos)
          setSlide(0)
          setIsPlaying(false)
        }}
        selectedSubject={selSubject}
        selectedChapter={selChapter}
        selectedLesson={selLesson}
        onSelectSubject={setSelSubject}
        onSelectChapter={setSelChapter}
        onSelectLesson={setSelLesson}
      />

      {/* 모드 드롭다운 외부 클릭 닫기 */}
      {showModeDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowModeDropdown(false)}
        />
      )}
    </div>
  )
}
