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
// 미니 퀴즈 (슬라이드별 1문제 할당)
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

// 챕터 테스트용 (기존 5문제 유지)
const XP_BY_QUESTION: Record<number, number> = { 3: 30, 4: 20, 5: 10 }

// ================================================================
// 오디오 플레이어
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
        {isPlaying ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
      </button>
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
      <style>{`@keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
    </div>
  )
}

// ================================================================
// 타입
// ================================================================

type LessonStep = 'slide' | 'chapter-test' | 'result'

// ================================================================
// 메인 레슨 페이지
// ================================================================

export default function LessonPage() {
  const router = useRouter()
  const totalSlides = DUMMY_LESSON.slides.length

  // ── 레슨 정보 ──────────────────────────────────────────────────
  const [currentSubject, setCurrentSubject] = useState('기능 해부학')
  const [currentChapter, setCurrentChapter] = useState('기시·정지 이해')
  const [currentLesson, setCurrentLesson] = useState('대퇴직근 기시·정지')

  // ── 슬라이드 ────────────────────────────────────────────────────
  const [slide, setSlide] = useState(0)
  const [lessonStep, setLessonStep] = useState<LessonStep>('slide')
  const current = DUMMY_LESSON.slides[slide]

  // ── 체크박스 ─────────────────────────────────────────────────────
  const [checked, setChecked] = useState<boolean[][]>(
    DUMMY_LESSON.slides.map((s) => Array(s.checkboxes.length).fill(false))
  )

  // ── 슬라이드별 미니퀴즈 상태 ─────────────────────────────────────
  const [miniDonePerSlide, setMiniDonePerSlide]       = useState<boolean[]>(DUMMY_LESSON.slides.map(() => false))
  const [miniCorrectPerSlide, setMiniCorrectPerSlide] = useState<boolean[]>(DUMMY_LESSON.slides.map(() => false))
  const [miniSelectedPerSlide, setMiniSelectedPerSlide] = useState<(number | null)[]>(
    DUMMY_LESSON.slides.map(() => null)
  )
  const [showWrongPopup, setShowWrongPopup] = useState(false)

  // ── 챕터 테스트 상태 (마지막 슬라이드 완료 후) ─────────────────
  const [chapterQIdx, setChapterQIdx]         = useState(0)
  const [chapterCorrect, setChapterCorrect]   = useState<number | null>(null)
  const [chapterSelected, setChapterSelected] = useState<number | null>(null)
  const [chapterAnswered, setChapterAnswered] = useState(false)

  // ── 모드 ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [showModeDropdown, setShowModeDropdown] = useState(false)

  // ── 진입 팝업 ───────────────────────────────────────────────────
  const [showModeSelectPopup, setShowModeSelectPopup] = useState(false)
  const [showStartPopup, setShowStartPopup]           = useState(false)
  const [modeSelectDontShow, setModeSelectDontShow]   = useState(false)
  const [lessonStarted, setLessonStarted]             = useState(false)

  // ── 오디오 ───────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)

  // ── 토스트 ───────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 네비게이터 ───────────────────────────────────────────────────
  const [showNavigator, setShowNavigator] = useState(false)
  const [navPos, setNavPos] = useState<NavigatorPosition>({
    subjectId: 'functional',
    chapterId: 'func-c1',
    lessonId: 'func-c1-l1',
  })
  const [selSubject, setSelSubject] = useState('functional')
  const [selChapter, setSelChapter] = useState('func-c1')
  const [selLesson, setSelLesson]   = useState('func-c1-l1')

  // ── 드래그 ──────────────────────────────────────────────────────
  const dragStartX    = useRef<number | null>(null)
  const dragCurrentX  = useRef<number>(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDragging    = useRef(false)
  const slideAreaRef  = useRef<HTMLDivElement>(null)
  const checkboxRefs  = useRef<(HTMLDivElement | null)[]>([])

  // ── 파생 값 ─────────────────────────────────────────────────────
  const allChecked         = checked[slide].every(Boolean)
  const checkedCount       = checked[slide].filter(Boolean).length
  const currentMiniDone    = miniDonePerSlide[slide]
  const currentMiniCorrect = miniCorrectPerSlide[slide]
  const currentMiniSel     = miniSelectedPerSlide[slide]
  const slideQuestion      = DUMMY_MINI_QUESTIONS[slide % DUMMY_MINI_QUESTIONS.length]
  const isLastSlide        = slide === totalSlides - 1
  // 수동 모드: 체크 + 미니퀴즈 모두 완료해야 이동 가능
  const canAdvance         = mode !== 'manual' || (allChecked && currentMiniDone)

  // ── useEffect ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedMode = localStorage.getItem('kinepia_lesson_mode') as 'manual' | 'auto' | null
    if (savedMode) setMode(savedMode)
    const modeSet = localStorage.getItem('kinepia_lesson_mode_set')
    const started = sessionStorage.getItem('kinepia_lesson_started')
    if (!modeSet) setShowModeSelectPopup(true)
    else if (!started) setShowStartPopup(true)
    else setLessonStarted(true)
  }, [])

  useEffect(() => {
    if (!lessonStarted) return
    setIsPlaying(true)
  }, [slide, lessonStarted])

  // 자동 모드: 음성 완료 후 다음 슬라이드
  useEffect(() => {
    if (mode !== 'auto' || !isPlaying) return
    const audioSeconds = parseInt(current.audioTime.split(':')[1] ?? '20')
    const timer = setTimeout(() => {
      setIsPlaying(false)
      if (slide < totalSlides - 1) setSlide((s) => s + 1)
      else { setLessonStep('chapter-test'); setIsPlaying(false) }
    }, (audioSeconds + 1) * 1000)
    return () => clearTimeout(timer)
  }, [mode, isPlaying, slide, current.audioTime, totalSlides])

  // ── 토스트 표시 ─────────────────────────────────────────────────
  const showToastMessage = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [])

  // ── 모드 변경 ────────────────────────────────────────────────────
  const handleModeChange = (m: 'manual' | 'auto') => {
    setMode(m)
    if (typeof window !== 'undefined') localStorage.setItem('kinepia_lesson_mode', m)
    setShowModeDropdown(false)
    setIsPlaying(false)
  }

  const handleModeSelectConfirm = () => {
    if (modeSelectDontShow && typeof window !== 'undefined')
      localStorage.setItem('kinepia_lesson_mode_set', '1')
    setShowModeSelectPopup(false)
    if (!sessionStorage.getItem('kinepia_lesson_started')) setShowStartPopup(true)
  }

  const handleStartLesson = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem('kinepia_lesson_started', '1')
    setShowStartPopup(false)
    setLessonStarted(true)
  }

  // ── 슬라이드별 미니퀴즈 답변 ─────────────────────────────────────
  const handleSlideAnswer = (optionIdx: number) => {
    if (currentMiniDone || !allChecked) return
    const correct = optionIdx === slideQuestion.answer

    setMiniSelectedPerSlide((prev) => { const n = [...prev]; n[slide] = optionIdx; return n })
    setMiniDonePerSlide((prev)     => { const n = [...prev]; n[slide] = true;      return n })
    setMiniCorrectPerSlide((prev)  => { const n = [...prev]; n[slide] = correct;   return n })

    if (!correct) setShowWrongPopup(true)
  }

  // ── 다음 이동 ────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (isLastSlide) {
      setLessonStep('chapter-test')
      setIsPlaying(false)
    } else {
      setSlide((s) => s + 1)
    }
  }, [isLastSlide])

  const tryNext = useCallback(() => {
    if (mode === 'manual') {
      if (!allChecked) { showToastMessage('체크리스트를 모두 완료해주세요'); return }
      if (!currentMiniDone) { showToastMessage('미니퀴즈를 완료해주세요'); return }
    }
    goNext()
  }, [mode, allChecked, currentMiniDone, goNext, showToastMessage])

  // ── 드래그 핸들러 ────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => { dragStartX.current = e.clientX; isDragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || dragStartX.current === null) return
    const delta = e.clientX - dragStartX.current
    dragCurrentX.current = delta; setDragOffset(delta)
  }
  const finishDrag = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = dragCurrentX.current
    dragCurrentX.current = 0; setDragOffset(0); dragStartX.current = null
    if (delta < -50) {
      // 앞으로 스와이프
      if (mode === 'manual' && !canAdvance) {
        if (!allChecked) showToastMessage('체크리스트를 모두 완료해주세요')
        else showToastMessage('미니퀴즈를 완료해주세요')
        return
      }
      goNext()
    } else if (delta > 50 && slide > 0) {
      setSlide(slide - 1)
    }
  }
  const onTouchStart = (e: React.TouchEvent) => { dragStartX.current = e.touches[0].clientX; isDragging.current = true }
  const onTouchMove  = (e: React.TouchEvent) => {
    if (!isDragging.current || dragStartX.current === null) return
    const delta = e.touches[0].clientX - dragStartX.current
    dragCurrentX.current = delta; setDragOffset(delta)
  }

  // ── 챕터 테스트 답변 ─────────────────────────────────────────────
  const handleChapterAnswer = (optionIdx: number) => {
    if (chapterAnswered) return
    setChapterSelected(optionIdx)
    setChapterAnswered(true)
    const correct = optionIdx === DUMMY_MINI_QUESTIONS[chapterQIdx].answer
    setTimeout(() => {
      if (chapterQIdx < 2) {
        setChapterQIdx((i) => i + 1); setChapterSelected(null); setChapterAnswered(false)
      } else {
        if (correct) { setChapterCorrect(chapterQIdx + 1); setLessonStep('result') }
        else if (chapterQIdx < DUMMY_MINI_QUESTIONS.length - 1) {
          setChapterQIdx((i) => i + 1); setChapterSelected(null); setChapterAnswered(false)
        } else { setChapterCorrect(null); setLessonStep('result') }
      }
    }, 500)
  }

  const resetChapterTest = () => {
    setChapterQIdx(0); setChapterCorrect(null); setChapterSelected(null); setChapterAnswered(false)
    setLessonStep('chapter-test')
  }

  const xpEarned = chapterCorrect !== null ? (XP_BY_QUESTION[chapterCorrect] ?? 10) : 5

  // ── 진행 바 / 헤더 ───────────────────────────────────────────────
  const pct = lessonStep === 'slide' ? Math.round(((slide + 1) / totalSlides) * 100) : 100
  const headerRight =
    lessonStep === 'slide' ? `${slide + 1}/${totalSlides}`
    : lessonStep === 'chapter-test' ? '챕터 테스트'
    : '완료'
  const subjectColor = NAVIGATOR_DATA.find((s) => s.id === navPos.subjectId)?.color ?? '#378ADD'

  // ================================================================
  // 공통 상단 헤더
  // ================================================================
  const StickyHeader = (
    <div className="sticky top-0 z-20">
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => router.push('/trainer/education')}
          className="flex items-center gap-0.5 text-[13px] text-[#6B6B6B] flex-shrink-0"
        >
          <ChevronLeft size={16} /> 뒤로
        </button>
        <button
          onClick={() => { setSelSubject(navPos.subjectId); setSelChapter(navPos.chapterId); setSelLesson(navPos.lessonId); setShowNavigator(true) }}
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
            <span className="text-[11px] font-bold text-[#378ADD]">{mode === 'manual' ? '수동' : '자동'}</span>
            <ChevronDown size={11} className="text-[#378ADD]" />
          </button>
          {showModeDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-30 overflow-hidden w-24">
              {(['manual', 'auto'] as const).map((m) => (
                <button key={m} onClick={() => handleModeChange(m)}
                  className={`w-full px-3 py-2.5 text-left text-[12px] font-medium ${mode === m ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'text-[#1A1A1A] hover:bg-[#F5F5F3]'}`}
                >
                  {m === 'manual' ? '수동' : '자동'}
                </button>
              ))}
            </div>
          )}
          <span className="text-[11px] text-[#6B6B6B] font-medium">{headerRight}</span>
        </div>
      </div>
      <div className="bg-[#F8F8F8] px-[14px] py-[6px] flex items-center gap-1.5" style={{ borderBottom: '0.5px solid #E0E0E0' }}>
        <span className="text-[11px] text-[#6B6B6B]">{currentChapter}</span>
        <span className="text-[11px] text-[#ADADAD]">›</span>
        <span className="text-[11px] text-[#1A1A1A] font-medium">{currentLesson}</span>
      </div>
      <div className="h-1.5 bg-[#E5E5E5]">
        <div className="h-full bg-[#378ADD] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )

  // ================================================================
  // 챕터 테스트 화면
  // ================================================================
  if (lessonStep === 'chapter-test') {
    const q = DUMMY_MINI_QUESTIONS[chapterQIdx]
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
        {StickyHeader}
        <div className="flex-1 overflow-y-auto pb-6 px-4 pt-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-black text-[#1A1A1A]">📝 챕터 테스트</span>
            <span className="text-[11px] text-[#6B6B6B] bg-white border border-[#E5E5E5] rounded-full px-3 py-1">
              {chapterQIdx + 1} / {DUMMY_MINI_QUESTIONS.length}
            </span>
          </div>
          <p className="text-[11px] text-[#ADADAD] mb-4">정답을 맞히면 바로 완료! 최소 3문제 · 최대 5문제</p>
          <div className="flex gap-1.5 mb-5">
            {DUMMY_MINI_QUESTIONS.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i < chapterQIdx ? 'bg-[#639922]' : i === chapterQIdx ? 'bg-[#378ADD]' : 'bg-[#E5E5E5]'}`} />
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-4">
            <p className="text-[15px] font-bold text-[#1A1A1A] leading-snug">{q.question}</p>
          </div>
          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              let style = 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
              if (chapterSelected === i) style = 'bg-[#378ADD]/10 border-[#378ADD] text-[#1A1A1A]'
              else if (chapterAnswered) style = 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-40'
              return (
                <button key={i} onClick={() => handleChapterAnswer(i)} disabled={chapterAnswered}
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
  // 결과 화면
  // ================================================================
  if (lessonStep === 'result') {
    const lastQ = DUMMY_MINI_QUESTIONS[chapterQIdx]
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
        {StickyHeader}
        <div className="flex-1 overflow-y-auto pb-6 px-4 pt-6">
          <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 text-center">
            <div className="text-[40px] mb-2">{chapterCorrect !== null ? '🎉' : '😅'}</div>
            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-1">챕터 테스트 완료!</h2>
            <div className="inline-flex items-center gap-1.5 bg-[#FFF9E6] border border-[#FFE066] rounded-full px-4 py-1.5 mt-2 mb-5">
              <span className="text-[16px]">⭐</span>
              <span className="text-[15px] font-black text-[#1A1A1A]">+{xpEarned} XP 획득</span>
            </div>
            <div
              className={`rounded-2xl p-4 mb-5 text-left`}
              style={{ backgroundColor: chapterCorrect !== null ? 'rgba(99,153,34,0.06)' : 'rgba(226,75,74,0.05)',
                border: `1px solid ${chapterCorrect !== null ? 'rgba(99,153,34,0.2)' : 'rgba(226,75,74,0.2)'}` }}
            >
              <div className={`text-[13px] font-bold mb-2 ${chapterCorrect !== null ? 'text-[#639922]' : 'text-[#E24B4A]'}`}>
                {chapterCorrect !== null ? `✅ ${chapterCorrect}번째 시도에서 정답!` : '❌ 아쉬워요, 다음엔 꼭 맞춰봐요'}
              </div>
              <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{lastQ.explanation}</p>
            </div>
            <div className="flex justify-center gap-1.5 mb-5">
              {DUMMY_MINI_QUESTIONS.map((_, i) => {
                const qNum = i + 1
                const lastN = chapterCorrect ?? DUMMY_MINI_QUESTIONS.length
                if (qNum > lastN) return null
                return (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${chapterCorrect === qNum ? 'bg-[#639922] text-white' : 'bg-[#E5E5E5] text-[#6B6B6B]'}`}>
                    {qNum}
                  </div>
                )
              })}
            </div>
            <div className="space-y-2.5">
              <button onClick={() => router.push('/trainer/education')}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#378ADD] text-white rounded-2xl text-[14px] font-bold"
              >
                학습 완료 →
              </button>
              <button onClick={resetChapterTest}
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
  // 슬라이드 화면
  // ================================================================

  // 다음 버튼 스타일
  const nextBtnStyle = canAdvance
    ? isLastSlide
      ? 'bg-[#00A651] text-white active:opacity-90'
      : 'bg-[#378ADD] text-white active:opacity-90'
    : 'bg-[#378ADD]/25 text-white/50 cursor-not-allowed'

  const nextBtnLabel = canAdvance && isLastSlide ? '챕터 테스트 시작하기' : '다음'

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      {StickyHeader}

      {/* 슬라이드 영역 */}
      <div
        ref={slideAreaRef}
        className="flex-1 overflow-y-auto pb-24 select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={finishDrag}
        onMouseLeave={finishDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={finishDrag}
      >
        <div
          className="transition-transform duration-150"
          style={{ transform: `translateX(${Math.max(-80, Math.min(80, dragOffset))}px)` }}
        >
          {/* 이미지 */}
          <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-[#E5E5E5]" style={{ backgroundColor: current.imageBg }}>
            <div className="flex flex-col items-center justify-center py-10 px-6 gap-3">
              <div className="text-[40px] opacity-30">🖼</div>
              <div className="text-[13px] font-semibold text-[#6B6B6B]">[{current.imageLabel}]</div>
              <div className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: subjectColor }}>
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
            <AudioBar audioTime={current.audioTime} isPlaying={isPlaying} onToggle={() => setIsPlaying((v) => !v)} />
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
                      if (currentMiniDone) return
                      const next = [...checked]; next[slide] = [...next[slide]]; next[slide][i] = !next[slide][i]
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
                    <span className={`text-[13px] leading-snug transition-all ${checked[slide][i] ? 'line-through text-[#ADADAD]' : 'text-[#1A1A1A]'}`}>
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

          {/* ── 인라인 미니퀴즈 (수동 모드 전용) ── */}
          {mode === 'manual' && (
            <div
              className={`mx-4 mt-4 transition-all duration-500 ${
                allChecked ? 'opacity-100' : 'opacity-30 pointer-events-none'
              }`}
            >
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-black text-[#1A1A1A]">⚡ 미니 퀴즈</span>
                  {currentMiniDone && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      currentMiniCorrect ? 'bg-[#639922]/10 text-[#639922]' : 'bg-[#E24B4A]/10 text-[#E24B4A]'
                    }`}>
                      {currentMiniCorrect ? '✅ 정답' : '❌ 오답'}
                    </span>
                  )}
                  {!allChecked && (
                    <span className="text-[10px] text-[#ADADAD]">체크리스트 완료 후 활성화</span>
                  )}
                </div>

                <p className="text-[14px] font-bold text-[#1A1A1A] mb-3 leading-snug">
                  {slideQuestion.question}
                </p>

                <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  {slideQuestion.options.map((opt, i) => {
                    let style = 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                    if (currentMiniDone) {
                      if (i === slideQuestion.answer) style = 'bg-[#639922]/10 border-[#639922] text-[#639922]'
                      else if (i === currentMiniSel) style = 'bg-[#E24B4A]/5 border-[#E24B4A]/30 text-[#ADADAD]'
                      else style = 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-40'
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleSlideAnswer(i)}
                        disabled={currentMiniDone || !allChecked}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left text-[13px] font-medium transition-all ${style}`}
                      >
                        <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 border-current">
                          {String.fromCharCode(9312 + i)}
                        </span>
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {currentMiniDone && (
                  <div className={`mt-3 p-3 rounded-xl text-[12px] font-medium leading-relaxed ${
                    currentMiniCorrect
                      ? 'bg-[#639922]/8 text-[#639922]'
                      : 'bg-[#E24B4A]/5 text-[#E24B4A]'
                  }`}
                    style={{ backgroundColor: currentMiniCorrect ? 'rgba(99,153,34,0.06)' : 'rgba(226,75,74,0.05)' }}
                  >
                    {slideQuestion.explanation}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 도트 네비게이션 */}
          <div className="flex items-center justify-center gap-2 mt-5 mb-2">
            {DUMMY_LESSON.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (i !== slide) setSlide(i) }}
                className={`rounded-full transition-all ${i === slide ? 'w-4 h-2 bg-[#378ADD]' : 'w-2 h-2 bg-[#CCCCCC] hover:bg-[#ADADAD]'}`}
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
        <button
          onClick={() => { if (slide > 0) setSlide(slide - 1) }}
          disabled={slide === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 border border-[#E5E5E5] rounded-2xl text-[14px] font-medium text-[#6B6B6B] disabled:opacity-30"
        >
          <ChevronLeft size={16} /> 이전
        </button>
        <button
          onClick={tryNext}
          className={`flex-[2] flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-[14px] font-bold transition-all ${nextBtnStyle}`}
        >
          {nextBtnLabel} <span className="text-[16px]">›</span>
        </button>
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ── 오답 팝업 ── */}
      {showWrongPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-40 pb-6 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl">
            <div className="text-center mb-4">
              <div className="text-[32px] mb-2">😅</div>
              <h3 className="text-[16px] font-black text-[#1A1A1A] mb-1">아쉽게 틀렸어요</h3>
              <p className="text-[12px] text-[#6B6B6B]">다시 학습하거나 다음 레슨으로 이동하세요</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowWrongPopup(false)
                  // 체크박스 + 미니퀴즈 초기화
                  setChecked((prev) => { const n = [...prev]; n[slide] = Array(DUMMY_LESSON.slides[slide].checkboxes.length).fill(false); return n })
                  setMiniDonePerSlide((prev)     => { const n = [...prev]; n[slide] = false; return n })
                  setMiniSelectedPerSlide((prev) => { const n = [...prev]; n[slide] = null;  return n })
                  setMiniCorrectPerSlide((prev)  => { const n = [...prev]; n[slide] = false; return n })
                }}
                className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-[13px] font-medium text-[#6B6B6B]"
              >
                다시 학습하기
              </button>
              <button
                onClick={() => { setShowWrongPopup(false); goNext() }}
                className="flex-1 py-3 bg-[#378ADD] rounded-xl text-[13px] font-bold text-white"
              >
                다음 레슨으로
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 모드 선택 팝업 ── */}
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
                <button key={m} onClick={() => handleModeChange(m)}
                  className={`w-full py-3.5 rounded-2xl text-[14px] font-bold border-2 transition-all ${mode === m ? 'bg-[#378ADD] border-[#378ADD] text-white' : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'}`}
                >
                  {m === 'manual' ? '📝 수동 모드' : '▶ 자동 모드'}
                </button>
              ))}
            </div>
            <div onClick={() => setModeSelectDontShow((v) => !v)} className="flex items-center gap-2 mb-4 cursor-pointer">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${modeSelectDontShow ? 'bg-[#378ADD] border-[#378ADD]' : 'border-[#CCCCCC]'}`}>
                {modeSelectDontShow && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-[#6B6B6B]">다시 보지 않기</span>
            </div>
            <button onClick={handleModeSelectConfirm} className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold">
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 시작하기 팝업 ── */}
      {!showModeSelectPopup && showStartPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center mb-5">
              <div className="text-[36px] mb-2">🚀</div>
              <h3 className="text-[18px] font-black text-[#1A1A1A] mb-1">학습을 시작할게요!</h3>
            </div>
            <div className="bg-[#F5F5F3] rounded-2xl p-4 mb-5 space-y-2.5">
              {[
                { label: '현재 레슨', value: currentLesson },
                { label: '챕터', value: currentChapter },
                { label: '예상 시간', value: '약 12분' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[#ADADAD]">{label}</span>
                  <span className="text-[12px] font-semibold text-[#1A1A1A]">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#ADADAD]">모드</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white ${mode === 'manual' ? 'bg-[#378ADD]' : 'bg-[#639922]'}`}>
                  {mode === 'manual' ? '📝 수동' : '▶ 자동'}
                </span>
              </div>
            </div>
            <button onClick={handleStartLesson}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-black"
            >
              시작하기 →
            </button>
          </div>
        </div>
      )}

      {/* ── 레슨 네비게이터 ── */}
      <LessonNavigator
        open={showNavigator}
        current={navPos}
        onClose={() => setShowNavigator(false)}
        onNavigate={(pos) => {
          const subject = NAVIGATOR_DATA.find((s) => s.id === pos.subjectId)
          const chapter = subject?.chapters.find((c) => c.id === pos.chapterId)
          const lesson  = chapter?.lessons.find((l) => l.id === pos.lessonId)
          setCurrentSubject(subject?.title ?? currentSubject)
          setCurrentChapter(chapter?.title ?? currentChapter)
          setCurrentLesson(lesson?.title ?? currentLesson)
          setNavPos(pos)
          setSlide(0)
          setLessonStep('slide')
          setIsPlaying(false)
          setChecked(DUMMY_LESSON.slides.map((s) => Array(s.checkboxes.length).fill(false)))
          setMiniDonePerSlide(DUMMY_LESSON.slides.map(() => false))
          setMiniCorrectPerSlide(DUMMY_LESSON.slides.map(() => false))
          setMiniSelectedPerSlide(DUMMY_LESSON.slides.map(() => null))
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
