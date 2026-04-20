'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Play, Pause, Volume2 } from 'lucide-react'
import { LessonNavigator, NAVIGATOR_DATA, type NavigatorPosition } from '@/components/common/LessonNavigator'

// ================================================================
// 더미 슬라이드 데이터
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
// 미니 테스트 더미 문제
// ================================================================

const DUMMY_MINI_QUESTIONS = [
  {
    id: 1,
    question: '대퇴직근의 기시점(Origin)은 어디인가요?',
    options: ['전하장골극 (AIIS)', '대퇴골 소전자', '장골능 (Iliac Crest)', '슬개골 (Patella)'],
    answer: 0,
    explanation: '대퇴직근의 기시점은 전하장골극(AIIS)입니다.',
  },
  {
    id: 2,
    question: '대퇴직근은 어떤 근육 유형에 속하나요?',
    options: ['Tonic 근육', 'Phasic 근육', '중립 근육', '길항근'],
    answer: 0,
    explanation: '대퇴직근은 Tonic 근육으로 단축 경향이 있습니다.',
  },
  {
    id: 3,
    question: '대퇴직근의 주요 기능은?',
    options: [
      '슬관절 신전 + 고관절 굴곡',
      '슬관절 굴곡 + 고관절 신전',
      '고관절 외전',
      '슬관절 내회전',
    ],
    answer: 0,
    explanation: '대퇴직근은 슬관절 신전과 고관절 굴곡을 담당합니다.',
  },
  {
    id: 4,
    question: '대퇴직근 단축 시 나타나는 자세 변화는?',
    options: ['전방 골반 경사 증가', '후방 골반 경사 증가', '측방 골반 경사', '변화 없음'],
    answer: 0,
    explanation: '대퇴직근 단축 시 전방 골반 경사(Anterior Pelvic Tilt)가 증가합니다.',
  },
  {
    id: 5,
    question: '대퇴직근의 정지점(Insertion)은 어디인가요?',
    options: ['슬개골 상단', '대퇴골 소전자', '경골 조면', '비골두'],
    answer: 0,
    explanation: '대퇴직근의 정지점은 슬개골(Patella) 상단입니다.',
  },
]

// FIX 3: Q3 정답=30XP, Q4 정답=20XP, Q5 정답=10XP, 전부 오답=5XP
const XP_BY_QUESTION: Record<number, number> = { 3: 30, 4: 20, 5: 10 }

// ================================================================
// 오디오 플레이어 플레이스홀더
// ================================================================

function AudioBar({
  audioTime,
  isPlaying,
  onToggle,
}: {
  audioTime: string
  isPlaying: boolean
  onToggle: () => void
}) {
  const bars = [3, 6, 9, 7, 4, 8, 5, 10, 6, 3, 7, 9, 4, 6, 8, 5, 3, 7, 6, 4]
  return (
    <div className="flex items-center gap-3 bg-[#F8F8F8] rounded-xl px-3 py-2.5">
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-full bg-[#378ADD] flex items-center justify-center flex-shrink-0 active:opacity-80"
      >
        {isPlaying ? (
          <Pause size={14} className="text-white" />
        ) : (
          <Play size={14} className="text-white ml-0.5" />
        )}
      </button>
      <div className="flex items-center gap-[2px] flex-1 h-6">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all"
            style={{
              height: `${isPlaying ? h * 2 : 4}px`,
              backgroundColor: isPlaying ? '#378ADD' : '#CCCCCC',
              animation: isPlaying
                ? `wave ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate`
                : 'none',
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
        @keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  )
}

// ================================================================
// 타입
// ================================================================

type LessonStep = 'slide' | 'mini-test' | 'result'
type PendingTarget = number | 'mini-test' | null

// ================================================================
// 메인 레슨 페이지
// ================================================================

export default function LessonPage() {
  const router = useRouter()
  const totalSlides = DUMMY_LESSON.slides.length

  // ── STEP 1: 현재 레슨 이름 상태 ────────────────────────────────
  const [currentSubject, setCurrentSubject] = useState('기능 해부학')
  const [currentChapter, setCurrentChapter] = useState('기시·정지 이해')
  const [currentLesson, setCurrentLesson] = useState('대퇴직근 기시·정지')

  // ── 슬라이드 상태 ────────────────────────────────────────────────
  const [slide, setSlide] = useState(0)
  const [lessonStep, setLessonStep] = useState<LessonStep>('slide')
  const current = DUMMY_LESSON.slides[slide]

  // ── 체크박스 ─────────────────────────────────────────────────────
  const [checked, setChecked] = useState<boolean[][]>(
    DUMMY_LESSON.slides.map((s) => Array(s.checkboxes.length).fill(false))
  )

  // ── 모드 ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [showModeDropdown, setShowModeDropdown] = useState(false)

  // ── STEP 2: 진입 팝업 ───────────────────────────────────────────
  const [showModeSelectPopup, setShowModeSelectPopup] = useState(false)
  const [showStartPopup, setShowStartPopup] = useState(false)
  const [modeSelectDontShow, setModeSelectDontShow] = useState(false)
  const [lessonStarted, setLessonStarted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedMode = localStorage.getItem('kinepia_lesson_mode') as 'manual' | 'auto' | null
    if (savedMode) setMode(savedMode)

    const modeSet = localStorage.getItem('kinepia_lesson_mode_set')
    const started = sessionStorage.getItem('kinepia_lesson_started')
    if (!modeSet) {
      setShowModeSelectPopup(true)
    } else if (!started) {
      setShowStartPopup(true)
    } else {
      // 같은 세션 재진입: 바로 시작
      setLessonStarted(true)
    }
  }, [])

  // FIX 1: 슬라이드 전환 시 음성 자동 재생
  useEffect(() => {
    if (!lessonStarted) return
    setIsPlaying(true)
  }, [slide, lessonStarted])

  const handleModeChange = (m: 'manual' | 'auto') => {
    setMode(m)
    if (typeof window !== 'undefined') localStorage.setItem('kinepia_lesson_mode', m)
    setShowModeDropdown(false)
    setIsPlaying(false)
  }

  const handleModeSelectConfirm = () => {
    if (modeSelectDontShow && typeof window !== 'undefined') {
      localStorage.setItem('kinepia_lesson_mode_set', '1')
    }
    setShowModeSelectPopup(false)
    const started = sessionStorage.getItem('kinepia_lesson_started')
    if (!started) setShowStartPopup(true)
  }

  const handleStartLesson = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem('kinepia_lesson_started', '1')
    setShowStartPopup(false)
    setLessonStarted(true) // slide-change useEffect가 setIsPlaying(true) 호출
  }

  // ── 오디오 ───────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)

  // ── 미완료 팝업 ───────────────────────────────────────────────────
  const [showIncompletePopup, setShowIncompletePopup] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null)

  // ── 미니 테스트 상태 ─────────────────────────────────────────────
  const [miniQIdx, setMiniQIdx] = useState(0)
  const [miniCorrectAttempt, setMiniCorrectAttempt] = useState<number | null>(null)
  const [miniSelected, setMiniSelected] = useState<number | null>(null)
  const [miniAnswered, setMiniAnswered] = useState(false)

  // ── 네비게이터 ───────────────────────────────────────────────────
  const [showNavigator, setShowNavigator] = useState(false)
  const [navPos, setNavPos] = useState<NavigatorPosition>({
    subjectId: 'functional',
    chapterId: 'func-c1',
    lessonId: 'func-c1-l1',
  })
  const [selSubject, setSelSubject] = useState('functional')
  const [selChapter, setSelChapter] = useState('func-c1')
  const [selLesson, setSelLesson] = useState('func-c1-l1')

  // ── 드래그 상태 ──────────────────────────────────────────────────
  const dragStartX = useRef<number | null>(null)
  const dragCurrentX = useRef<number>(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDragging = useRef(false)
  const slideAreaRef = useRef<HTMLDivElement>(null)
  const checkboxRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── 자동 모드: 음성 완료 후 다음 슬라이드 ────────────────────────
  useEffect(() => {
    if (mode !== 'auto' || !isPlaying) return
    const audioSeconds = parseInt(current.audioTime.split(':')[1] ?? '20')
    const timer = setTimeout(() => {
      setIsPlaying(false)
      if (slide < totalSlides - 1) {
        setSlide((s) => s + 1) // slide-change useEffect가 재생 재시작
      } else {
        setLessonStep('mini-test')
      }
    }, (audioSeconds + 1) * 1000)
    return () => clearTimeout(timer)
  }, [mode, isPlaying, slide, current.audioTime, totalSlides])

  // ── 슬라이드 이동 ────────────────────────────────────────────────
  const allChecked = checked[slide].every(Boolean)
  const checkedCount = checked[slide].filter(Boolean).length
  const firstUncheckedIdx = checked[slide].findIndex((v) => !v)

  // FIX 2: 미완료 팝업은 "다음"/"미니 테스트" 버튼에서만 호출
  const tryGoTo = useCallback(
    (target: number | 'mini-test') => {
      const needsCheck = mode === 'manual' && !allChecked
      if (needsCheck) {
        setPendingTarget(target)
        setShowIncompletePopup(true)
      } else {
        if (target === 'mini-test') {
          setLessonStep('mini-test')
          setIsPlaying(false)
        } else if (target >= 0 && target < totalSlides) {
          // FIX 1: setIsPlaying(false) 제거 — useEffect([slide, lessonStarted])가 자동 재생 처리
          setSlide(target)
        }
      }
    },
    [mode, allChecked, totalSlides]
  )

  // ── 드래그 핸들러 ────────────────────────────────────────────────
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
    dragCurrentX.current = 0
    setDragOffset(0)
    dragStartX.current = null
    // FIX 2: 드래그는 팝업 없이 자유 이동
    if (delta < -50) {
      if (slide === totalSlides - 1) { setLessonStep('mini-test'); setIsPlaying(false) }
      else setSlide(slide + 1)
    } else if (delta > 50 && slide > 0) {
      setSlide(slide - 1)
    }
  }
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
    dragCurrentX.current = 0
    setDragOffset(0)
    dragStartX.current = null
    // FIX 2: 드래그는 팝업 없이 자유 이동
    if (delta < -50) {
      if (slide === totalSlides - 1) { setLessonStep('mini-test'); setIsPlaying(false) }
      else setSlide(slide + 1)
    } else if (delta > 50 && slide > 0) {
      setSlide(slide - 1)
    }
  }

  // ── 미니 테스트 답 선택 (FIX 3: 최소 3문제 의무, 오답 빨간색 없음, 0.5초 전환) ─
  const handleMiniAnswer = (optionIdx: number) => {
    if (miniAnswered) return
    setMiniSelected(optionIdx)
    setMiniAnswered(true)
    const correct = optionIdx === DUMMY_MINI_QUESTIONS[miniQIdx].answer

    setTimeout(() => {
      if (miniQIdx < 2) {
        // Q1(idx 0), Q2(idx 1): 정오답 무관하게 다음 문제로 진행
        setMiniQIdx((i) => i + 1)
        setMiniSelected(null)
        setMiniAnswered(false)
      } else {
        // Q3(idx 2) ~ Q5(idx 4): 정답이면 result, 오답이면 다음 문제 or result
        if (correct) {
          setMiniCorrectAttempt(miniQIdx + 1) // 3, 4, or 5
          setLessonStep('result')
        } else if (miniQIdx < DUMMY_MINI_QUESTIONS.length - 1) {
          setMiniQIdx((i) => i + 1)
          setMiniSelected(null)
          setMiniAnswered(false)
        } else {
          // Q5 오답: 전부 실패
          setMiniCorrectAttempt(null)
          setLessonStep('result')
        }
      }
    }, 500)
  }

  const resetMiniTest = () => {
    setMiniQIdx(0)
    setMiniCorrectAttempt(null)
    setMiniSelected(null)
    setMiniAnswered(false)
    setLessonStep('mini-test')
  }

  const xpEarned =
    miniCorrectAttempt !== null ? (XP_BY_QUESTION[miniCorrectAttempt] ?? 10) : 5

  // ── 진행 바 % ────────────────────────────────────────────────────
  const pct =
    lessonStep === 'slide'
      ? Math.round(((slide + 1) / totalSlides) * 100)
      : 100

  // ── 헤더 우측 표시 ───────────────────────────────────────────────
  const headerRight =
    lessonStep === 'slide'
      ? `${slide + 1}/${totalSlides}`
      : lessonStep === 'mini-test'
      ? '미니 테스트'
      : '완료'

  const subjectColor =
    NAVIGATOR_DATA.find((s) => s.id === navPos.subjectId)?.color ?? '#378ADD'

  // ================================================================
  // ── 공통 상단 헤더 (STEP 3: sticky wrapper) ─────────────────────
  // ================================================================
  const StickyHeader = (
    <div className="sticky top-0 z-20">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => router.push('/trainer/education')}
          className="flex items-center gap-0.5 text-[13px] text-[#6B6B6B] flex-shrink-0"
        >
          <ChevronLeft size={16} /> 뒤로
        </button>

        {/* STEP 1: currentSubject 반영 */}
        <button
          onClick={() => {
            setSelSubject(navPos.subjectId)
            setSelChapter(navPos.chapterId)
            setSelLesson(navPos.lessonId)
            setShowNavigator(true)
          }}
          className="flex-1 flex items-center justify-center gap-1 min-w-0"
        >
          <span className="text-[14px] font-bold text-[#1A1A1A] truncate">{currentSubject}</span>
          <ChevronDown size={14} className="text-[#6B6B6B] flex-shrink-0" />
        </button>

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
          <span className="text-[11px] text-[#6B6B6B] font-medium">{headerRight}</span>
        </div>
      </div>

      {/* STEP 3: 서브타이틀 줄 */}
      <div className="bg-[#F8F8F8] px-[14px] py-[6px] flex items-center gap-1.5"
        style={{ borderBottom: '0.5px solid #E0E0E0' }}>
        <span className="text-[11px] text-[#6B6B6B]">{currentChapter}</span>
        <span className="text-[11px] text-[#ADADAD]">›</span>
        <span className="text-[11px] text-[#1A1A1A] font-medium">{currentLesson}</span>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-[#E5E5E5]">
        <div
          className="h-full bg-[#378ADD] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )

  // ================================================================
  // STEP 4: 미니 테스트 화면
  // ================================================================
  if (lessonStep === 'mini-test') {
    const q = DUMMY_MINI_QUESTIONS[miniQIdx]
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
        {StickyHeader}
        <div className="flex-1 overflow-y-auto pb-6 px-4 pt-5">
          {/* 미니 테스트 헤더 */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-black text-[#1A1A1A]">⚡ 미니 테스트</span>
            <span className="text-[11px] text-[#6B6B6B] bg-white border border-[#E5E5E5] rounded-full px-3 py-1">
              문제 {miniQIdx + 1} / {DUMMY_MINI_QUESTIONS.length}
            </span>
          </div>
          <p className="text-[11px] text-[#ADADAD] mb-4">정답을 맞히면 바로 완료! 최소 3문제 · 최대 5문제</p>

          {/* 진행 점 */}
          <div className="flex gap-1.5 mb-5">
            {DUMMY_MINI_QUESTIONS.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${
                i < miniQIdx ? 'bg-[#639922]' : i === miniQIdx ? 'bg-[#378ADD]' : 'bg-[#E5E5E5]'
              }`} />
            ))}
          </div>

          {/* 문제 카드 */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-4">
            <p className="text-[15px] font-bold text-[#1A1A1A] leading-snug">{q.question}</p>
          </div>

          {/* 보기 — FIX 3: 정오답 색상 없음, 선택=파란색만 */}
          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              let style = 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
              if (miniSelected === i) {
                style = 'bg-[#378ADD]/10 border-[#378ADD] text-[#1A1A1A]'
              } else if (miniAnswered) {
                style = 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-40'
              }
              return (
                <button
                  key={i}
                  onClick={() => handleMiniAnswer(i)}
                  disabled={miniAnswered}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left text-[14px] font-medium transition-all ${style}`}
                >
                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold flex-shrink-0 border-current">
                    {String.fromCharCode(9312 + i)}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // STEP 4: 결과 화면
  // ================================================================
  if (lessonStep === 'result') {
    const lastQ = DUMMY_MINI_QUESTIONS[miniQIdx]
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
        {StickyHeader}
        <div className="flex-1 overflow-y-auto pb-6 px-4 pt-6">
          <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 text-center">
            <div className="text-[40px] mb-2">{miniCorrectAttempt !== null ? '🎉' : '😅'}</div>
            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-1">미니 테스트 완료!</h2>

            {/* XP */}
            <div className="inline-flex items-center gap-1.5 bg-[#FFF9E6] border border-[#FFE066] rounded-full px-4 py-1.5 mt-2 mb-5">
              <span className="text-[16px]">⭐</span>
              <span className="text-[15px] font-black text-[#1A1A1A]">+{xpEarned} XP 획득</span>
            </div>

            {/* 정답 여부 */}
            <div className={`rounded-2xl p-4 mb-5 text-left ${
              miniCorrectAttempt !== null
                ? 'bg-[#639922]/8 border border-[#639922]/20'
                : 'bg-[#E24B4A]/5 border border-[#E24B4A]/20'
            }`}
              style={{ backgroundColor: miniCorrectAttempt !== null ? 'rgba(99,153,34,0.06)' : 'rgba(226,75,74,0.05)' }}
            >
              <div className={`text-[13px] font-bold mb-2 ${
                miniCorrectAttempt !== null ? 'text-[#639922]' : 'text-[#E24B4A]'
              }`}>
                {miniCorrectAttempt !== null
                  ? `✅ ${miniCorrectAttempt}번째 시도에서 정답!`
                  : '❌ 아쉬워요, 다음엔 꼭 맞춰봐요'}
              </div>
              <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{lastQ.explanation}</p>
            </div>

            {/* 문제 번호 뱃지 — miniCorrectAttempt = 정답 문제 번호(3·4·5) */}
            <div className="flex justify-center gap-1.5 mb-5">
              {DUMMY_MINI_QUESTIONS.map((_, i) => {
                const qNum = i + 1
                const lastQ = miniCorrectAttempt ?? DUMMY_MINI_QUESTIONS.length
                if (qNum > lastQ) return null
                return (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    miniCorrectAttempt === qNum ? 'bg-[#639922] text-white' : 'bg-[#E5E5E5] text-[#6B6B6B]'
                  }`}>
                    {qNum}
                  </div>
                )
              })}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => router.push('/trainer/education')}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#378ADD] text-white rounded-2xl text-[14px] font-bold"
              >
                다음 레슨으로 →
              </button>
              <button
                onClick={resetMiniTest}
                className="w-full py-3.5 border border-[#E5E5E5] rounded-2xl text-[13px] font-medium text-[#6B6B6B]"
              >
                다시 풀기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // 슬라이드 화면 (lessonStep === 'slide')
  // ================================================================
  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      {StickyHeader}

      {/* 슬라이드 영역 */}
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
          {/* 이미지 */}
          <div
            className="mx-4 mt-4 rounded-2xl overflow-hidden border border-[#E5E5E5]"
            style={{ backgroundColor: current.imageBg }}
          >
            <div className="flex flex-col items-center justify-center py-10 px-6 gap-3">
              <div className="text-[40px] opacity-30">🖼</div>
              <div className="text-[13px] font-semibold text-[#6B6B6B]">[{current.imageLabel}]</div>
              <div
                className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: subjectColor }}
              >
                {current.imageSub}
              </div>
              <div className="text-[9px] text-[#ADADAD]">이미지 소스 확정 전 placeholder</div>
            </div>
          </div>

          {/* 동기화 라벨 */}
          <div className="mx-4 mt-2 flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-[#378ADD] animate-pulse" />
            <span className="text-[10px] text-[#378ADD] font-medium">↕ 이미지 + 텍스트 + 음성 동기화</span>
          </div>

          {/* 오디오 바 */}
          <div className="mx-4 mt-2">
            <AudioBar
              audioTime={current.audioTime}
              isPlaying={isPlaying}
              onToggle={() => setIsPlaying((v) => !v)}
            />
          </div>

          {/* 텍스트 + 체크박스 */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <div className="text-[13px] font-bold text-[#1A1A1A] mb-3">{current.title}</div>

            {mode === 'manual' ? (
              <div className="space-y-2.5">
                {current.checkboxes.map((text, i) => (
                  <div
                    key={i}
                    ref={(el) => { checkboxRefs.current[i] = el }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      const next = [...checked]
                      next[slide] = [...next[slide]]
                      next[slide][i] = !next[slide][i]
                      setChecked(next)
                    }}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      checked[slide][i] ? 'bg-[#378ADD] border-[#378ADD]' : 'border-[#CCCCCC] group-hover:border-[#378ADD]'
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

          {/* 도트 네비게이션 — FIX 2: 팝업 없이 자유 이동 */}
          <div className="flex items-center justify-center gap-2 mt-5 mb-2">
            {DUMMY_LESSON.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (i !== slide) setSlide(i) }}
                className={`rounded-full transition-all ${
                  i === slide ? 'w-4 h-2 bg-[#378ADD]' : 'w-2 h-2 bg-[#CCCCCC] hover:bg-[#ADADAD]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 하단 푸터 */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white border-t border-[#E5E5E5] px-4 py-3 flex items-center gap-3 z-20"
        style={{ maxWidth: 430 }}
      >
        {/* FIX 2: 이전 버튼은 팝업 없이 자유 이동 */}
        <button
          onClick={() => { if (slide > 0) setSlide(slide - 1) }}
          disabled={slide === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 border border-[#E5E5E5] rounded-2xl text-[14px] font-medium text-[#6B6B6B] disabled:opacity-30"
        >
          <ChevronLeft size={16} /> 이전
        </button>
        <button
          onClick={() => tryGoTo(slide < totalSlides - 1 ? slide + 1 : 'mini-test')}
          className="flex-[2] flex items-center justify-center gap-1.5 py-3.5 bg-[#378ADD] rounded-2xl text-[14px] font-bold text-white active:opacity-90"
        >
          {slide < totalSlides - 1 ? '다음' : '미니 테스트'} <span className="text-[16px]">›</span>
        </button>
      </div>

      {/* ─── 미완료 팝업 ─── */}
      {showIncompletePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-40 pb-6 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl">
            <div className="text-center mb-4">
              <div className="text-[32px] mb-2">📋</div>
              <h3 className="text-[16px] font-black text-[#1A1A1A] mb-1">모든 내용을 확인하지 않으셨습니다</h3>
              <p className="text-[12px] text-[#6B6B6B]">{checkedCount}/{current.checkboxes.length}개 확인 완료</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowIncompletePopup(false)
                  if (pendingTarget === 'mini-test') {
                    setLessonStep('mini-test')
                    setIsPlaying(false)
                  } else if (typeof pendingTarget === 'number') {
                    // FIX 1: setIsPlaying(false) 제거 — useEffect가 자동 재생
                    setSlide(pendingTarget)
                  }
                  setPendingTarget(null)
                }}
                className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-[13px] font-medium text-[#6B6B6B]"
              >
                건너뛰기
              </button>
              <button
                onClick={() => {
                  setShowIncompletePopup(false)
                  setPendingTarget(null)
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

      {/* ─── STEP 2: 모드 선택 팝업 ─── */}
      {showModeSelectPopup && (
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
                    mode === m ? 'bg-[#378ADD] border-[#378ADD] text-white' : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                  }`}
                >
                  {m === 'manual' ? '📝 수동 모드' : '▶ 자동 모드'}
                </button>
              ))}
            </div>
            <div onClick={() => setModeSelectDontShow((v) => !v)} className="flex items-center gap-2 mb-4 cursor-pointer">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                modeSelectDontShow ? 'bg-[#378ADD] border-[#378ADD]' : 'border-[#CCCCCC]'
              }`}>
                {modeSelectDontShow && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-[#6B6B6B]">다시 보지 않기</span>
            </div>
            <button
              onClick={handleModeSelectConfirm}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: 시작하기 팝업 ─── */}
      {!showModeSelectPopup && showStartPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center mb-5">
              <div className="text-[36px] mb-2">🚀</div>
              <h3 className="text-[18px] font-black text-[#1A1A1A] mb-1">학습을 시작할게요!</h3>
            </div>
            <div className="bg-[#F5F5F3] rounded-2xl p-4 mb-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#ADADAD]">현재 레슨</span>
                <span className="text-[12px] font-semibold text-[#1A1A1A]">{currentLesson}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#ADADAD]">챕터</span>
                <span className="text-[12px] font-semibold text-[#1A1A1A]">{currentChapter}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#ADADAD]">예상 시간</span>
                <span className="text-[12px] font-semibold text-[#1A1A1A]">약 12분</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#ADADAD]">모드</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white ${
                  mode === 'manual' ? 'bg-[#378ADD]' : 'bg-[#639922]'
                }`}>
                  {mode === 'manual' ? '📝 수동' : '▶ 자동'}
                </span>
              </div>
            </div>
            <button
              onClick={handleStartLesson}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-black"
            >
              시작하기 →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 1: 레슨 네비게이터 ─── */}
      <LessonNavigator
        open={showNavigator}
        current={navPos}
        onClose={() => setShowNavigator(false)}
        onNavigate={(pos) => {
          // STEP 1: 제목 즉시 반영
          const subject = NAVIGATOR_DATA.find((s) => s.id === pos.subjectId)
          const chapter = subject?.chapters.find((c) => c.id === pos.chapterId)
          const lesson = chapter?.lessons.find((l) => l.id === pos.lessonId)
          setCurrentSubject(subject?.title ?? currentSubject)
          setCurrentChapter(chapter?.title ?? currentChapter)
          setCurrentLesson(lesson?.title ?? currentLesson)
          // 슬라이드 리셋 + 체크박스 초기화
          setNavPos(pos)
          setSlide(0)
          setLessonStep('slide')
          setIsPlaying(false)
          setChecked(DUMMY_LESSON.slides.map((s) => Array(s.checkboxes.length).fill(false)))
        }}
        selectedSubject={selSubject}
        selectedChapter={selChapter}
        selectedLesson={selLesson}
        onSelectSubject={setSelSubject}
        onSelectChapter={setSelChapter}
        onSelectLesson={setSelLesson}
      />

      {showModeDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowModeDropdown(false)} />
      )}
    </div>
  )
}
