'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight as ArrowRight, Check, Zap } from 'lucide-react'
import { track } from '@vercel/analytics'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
// Zap used in completion screen

const STYLE_KEY   = 'kinepia_learning_style'
const CERT_KEY    = 'kinepia_selected_cert'
const SUBJECT_KEY = 'kinepia_current_subject_id'
const MODE_KEY    = 'lesson_slide_mode'

const CERT_LABELS: Record<string, string> = {
  'exercise-prescriptionist': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
}

interface Question {
  id: string
  question: string
  options: string[]
  answer_index: number[] | null
  explanation: string | null
  difficulty?: string | null
  content_type?: string | null
  question_format?: string | null
  image_url?: string | null
  reference_text?: string | null
  key_points?: string[] | null
}

interface Slide {
  id: string
  question: string
  explanation: string
  key_points: string[]
  image_url: string | null
  reference_text: string | null
  exam_years: number[] | null
  star_rating: number | null
  content_type: string | null
  question_format: string | null
}

interface MiniQ {
  id: string
  text: string
  explanation: string | null
  options: [string, string]
  answerIdx: 0 | 1
}

function splitSentences(text: string): string[] {
  return text
    // 마침표/물음표/느낌표 뒤 공백을 문장 경계로 인식하되, 바로 뒤에 "("가 오면
    // (교재 p.25) 같은 문장 중간 페이지 인용이므로 거기서 끊지 않고 앞 문장에
    // 붙임. 원문자 목록(①②③...) 앞도 항목 경계로 인식 — 기존엔 마침표+공백만
    // 인식해 원문자 목록 전체가 한 항목에 뭉쳐 나오는 문제가 있었음
    .split(/(?<=[.。!?])\s+(?!\()|\s*(?=[①-⑳])/)
    .map((s) => s.replace(/[.。!?]$/, '').trim())
    .filter((s) => s.length > 1 && !/^\d+$/.test(s.trim()))
    .slice(0, 3)
}

function parseExplanation(text: string): { prose: string; points: string[] } {
  if (!text) return { prose: '', points: [] }

  // 번호 목록 패턴(1. 2. 또는 1) 2) 등)은 "줄 시작"에 올 때만 목록 구분자로
  // 인식(m 플래그 + ^). "(교재 p.25)" 같은 문장 중간 페이지 인용은 줄 시작이
  // 아니므로 매치되지 않아 prose가 거기서 잘리지 않음
  const parts = text.split(/^[ \t]*\d+[.)][ \t]+/m)
  const prose = parts[0].trim()
  const points = parts.slice(1)
    .map((p) => p.trim())
    .filter((p) => p.length > 2)

  return { prose, points }
}

function toSlideTitle(q: string): string {
  const t = q.trim()
  const m1 = t.match(/^(.+?)에\s*관한\s*설명으로\s*옳.+것은\??\s*$/)
  if (m1) return m1[1].trim() + '이란?'
  const m2 = t.match(/^(.+?)(?:으로|의\s*특징으로)\s*옳.+것은\??\s*$/)
  if (m2) return m2[1].trim() + '의 특징'
  const m3 = t.match(/^(.+?)[은는이가]\s*무엇인가\?\s*$/)
  if (m3) return m3[1].trim() + '이란?'
  return t.replace(/\?$/, '')
}

export default function LessonPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string
  const searchParams = useSearchParams()
  const certId = searchParams.get('certId')
  const certQuery = certId ? `?certId=${certId}` : ''

  const [chapterTitle, setChapterTitle] = useState('')
  const [subjectName, setSubjectName]   = useState('')
  const [courseDesc, setCourseDesc]     = useState<string | null>(null)
  const [chapterVideoUrl, setChapterVideoUrl] = useState<string | null>(null)
  const [chapterAudioUrl, setChapterAudioUrl] = useState<string | null>(null)
  const [chapterImageUrl, setChapterImageUrl] = useState<string | null>(null)
  const [questions, setQuestions]       = useState<Question[]>([])
  const [slides, setSlides]             = useState<Slide[]>([])
  const [style, setStyle]               = useState<'memorizer' | 'conceptualizer'>('conceptualizer')
  const [certLabel, setCertLabel]       = useState('')
  const [subjectId, setSubjectId]       = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [lessonSessionId, setLessonSessionId] = useState<string | null>(null)

  /* ── Slide navigation ───────────────────────── */
  const [slideIndex, setSlideIndex]       = useState(0)
  const slideEnterTimeRef = useRef<number>(Date.now())
  const [slideMode, setSlideMode]         = useState<'manual' | 'auto'>('manual')
  const [checkedSentences, setCheckedSentences] = useState<boolean[]>([])
  const [autoProgress, setAutoProgress]   = useState(0)

  /* ── Mini quiz ──────────────────────────────── */
  const [showMiniQuiz, setShowMiniQuiz]   = useState(false)
  const [miniQ, setMiniQ]                 = useState<MiniQ | null>(null)
  const [miniSelected, setMiniSelected]   = useState<0 | 1 | null>(null)
  const [miniConfirmed, setMiniConfirmed] = useState(false)
  const [showComplete, setShowComplete]   = useState(false)
  const pendingSlideIdxRef                = useRef(0)

  useEffect(() => {
    if (!lessonSessionId || !session?.user?.id) return
    const handleUnload = () => {
      navigator.sendBeacon(
        '/api/v1/chapter-session-log',
        JSON.stringify({
          userId:      session.user.id,
          chapterId,
          action:      'exit',
          sessionId:   lessonSessionId,
          pageType:    'lesson',
          isCompleted: showComplete,
          exitPoint:   showMiniQuiz ? 'mini_quiz' : 'slide',
        })
      )
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [lessonSessionId, session?.user?.id, slideIndex, showMiniQuiz, showComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Mini quiz session score ────────────────── */
  const miniCorrectRef = useRef(0)
  const miniTotalRef   = useRef(0)

  /* ── Related questions bottom sheet ─────────── */
  const [showRelatedQuestions, setShowRelatedQuestions] = useState(false)

  /* ── Swipe (touch + mouse) ──────────────────── */
  const [toastMsg, setToastMsg]     = useState<string | null>(null)
  const toastTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dragStartX  = useRef(0)
  const isDragging  = useRef(false)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    const s = localStorage.getItem(STYLE_KEY) as 'memorizer' | 'conceptualizer' | null
    if (s) setStyle(s)
    const cert = localStorage.getItem(CERT_KEY)
    if (cert && CERT_LABELS[cert]) setCertLabel(CERT_LABELS[cert])
    setSubjectId(localStorage.getItem(SUBJECT_KEY))
    const m = localStorage.getItem(MODE_KEY) as 'manual' | 'auto' | null
    if (m) setSlideMode(m)
    fetchData()
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── chapter-init: 첫 로드 시 chapter_stats row 생성 (없을 때만) ──────────
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !chapterId) return
    fetch('/api/v1/chapter-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId: localStorage.getItem(SUBJECT_KEY) ?? null,
        certId,
      }),
    }).catch(() => {})
  }, [session?.user?.id, chapterId, certId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !chapterId) return
    fetch('/api/v1/chapter-session-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        chapterId,
        action: 'enter',
        pageType: 'lesson',
      }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.sessionId) setLessonSessionId(data.sessionId) })
      .catch(() => {})
  }, [session?.user?.id, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCheckedSentences([])
  }, [slideIndex])

  const fetchData = async () => {
    const [{ data: ch }, { data: qs }] = await Promise.all([
      supabase.from('chapters').select('id, title, course_id, video_url, audio_url, image_url').eq('id', chapterId).single(),
      supabase.from('chapter_cards')
        .select('id, chapter_id, question, options, answer_index, explanation, order_index, content_type, question_format, image_url, reference_text, key_points, exam_years, star_rating')
        .eq('chapter_id', chapterId),
    ])

    if (ch) {
      setChapterTitle(ch.title)
      if (ch.video_url) setChapterVideoUrl(ch.video_url)
      if (ch.audio_url) setChapterAudioUrl(ch.audio_url)
      if (ch.image_url) setChapterImageUrl(ch.image_url)
      if (ch.course_id) {
        const { data: course } = await supabase
          .from('courses').select('id, subject_id, description, certification_id').eq('id', ch.course_id).single()
        if (course?.description) setCourseDesc(course.description)
        if (course?.subject_id) {
          const { data: subj } = await supabase
            .from('subjects').select('name').eq('id', course.subject_id).single()
          if (subj?.name) setSubjectName(subj.name)
        }
        if (course?.certification_id) {
          const { data: cert } = await supabase
            .from('certifications')
            .select('name')
            .eq('id', course.certification_id)
            .single()
          if (cert?.name) setCertLabel(cert.name)
        }
      }
    }

    const allQ = (qs ?? []).filter(q =>
      q.answer_index !== null &&
      Array.isArray(q.options) &&
      q.options.length >= 2
    )
    setQuestions(allQ)

    const oralQs = (qs ?? []).filter(q => q.content_type === 'lesson' || q.question_format === 'short_answer')
    const slideArray = oralQs.map(q => ({
      id: q.id,
      question: q.question,
      explanation: q.explanation ?? '',
      key_points: Array.isArray(q.key_points) ? q.key_points : [],
      image_url: q.image_url ?? null,
      reference_text: q.reference_text ?? null,
      exam_years: Array.isArray(q.exam_years) ? q.exam_years : null,
      star_rating: q.star_rating ?? null,
      content_type: q.content_type ?? null,
      question_format: q.question_format ?? null,
    }))
    setSlides(slideArray)

    track('lesson_started', { chapterId })
    setLoading(false)
  }

  /* ── Auto mode timer ───────────────────────────────── */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (slideMode !== 'auto' || showMiniQuiz || loading) return

    // 슬라이드 체류시간 로깅
    const now = Date.now()
    const duration = Math.round((now - slideEnterTimeRef.current) / 1000)
    const prevSlide = slides[slideIndex]
    if (prevSlide && duration > 0 && session?.user?.id) {
      fetch('/api/v1/lesson-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          chapterId,
          slideId: prevSlide.id,
          durationSeconds: duration,
          slideIndex,
        }),
      }).catch(() => {})
    }
    slideEnterTimeRef.current = now
    setAutoProgress(0)
    timerRef.current = setInterval(() => {
      setAutoProgress((p) => Math.min(p + 2, 100)) // 100ms × 50 = 5 s
    }, 100)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slideMode, slideIndex, showMiniQuiz, loading])

  /* ── Post-quiz navigation ──────────────────────────── */
  const advanceFromQuiz = () => {
    setShowMiniQuiz(false)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setMiniQ(null)
    if (pendingSlideIdxRef.current >= slides.length - 1) {
      // 학습 완료 → DB 저장
      fetch('/api/v1/lesson-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          subjectId: localStorage.getItem(SUBJECT_KEY) ?? '',
          miniQuizCorrect: miniCorrectRef.current,
          miniQuizTotal:   miniTotalRef.current,
          userId: session?.user?.id ?? '',
          certId,
        }),
      })
        .catch(() => {})
      track('lesson_completed', { chapterId })
      if (lessonSessionId && session?.user?.id) {
        fetch('/api/v1/chapter-session-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId:      session.user.id,
            chapterId,
            action:      'exit',
            sessionId:   lessonSessionId,
            pageType:    'lesson',
            isCompleted: true,
            exitPoint:   'lesson_complete',
          }),
        }).catch(() => {})
      }
      setShowComplete(true)
    } else {
      setSlideIndex(pendingSlideIdxRef.current + 1)
      setCheckedSentences([])
      setAutoProgress(0)
    }
  }

  /* ── Mini quiz trigger ─────────────────────────────── */
  const triggerMiniQuiz = (fromIdx: number) => {
    pendingSlideIdxRef.current = fromIdx

    // 현재 슬라이드에 해당하는 문제 사용
    const q = questions.find((q) => q.id === slides[fromIdx]?.id)
           ?? questions[fromIdx % Math.max(questions.length, 1)]
           ?? slides[fromIdx]
    if (!q) {
      // 문제 데이터 없으면 퀴즈 건너뛰고 바로 진행
      if (fromIdx >= slides.length - 1) {
        advanceFromQuiz()
      } else {
        setSlideIndex(fromIdx + 1)
        setCheckedSentences([])
        setAutoProgress(0)
      }
      return
    }

    // slides fallback 사용 시 answer_index가 없으면 oral 분기로 강제 이동
    if (q.answer_index === undefined || q.answer_index === null) {
      // oral 문제 — key_points/sentences로 2지선다 생성
      const currentPoints = Array.isArray(q.key_points) && q.key_points.filter(p => p.length > 1).length > 0
        ? q.key_points.filter(p => p.length > 1)
        : splitSentences(q.explanation ?? '')

      if (currentPoints.length === 0) {
        if (fromIdx >= slides.length - 1) { advanceFromQuiz() }
        else { setSlideIndex(fromIdx + 1); setCheckedSentences([]); setAutoProgress(0) }
        return
      }

      // 정답: 현재 슬라이드의 key_points 중 랜덤 1개
      const correct = currentPoints[Math.floor(Math.random() * currentPoints.length)]

      // 오답: 다른 슬라이드의 key_points 중 랜덤 1개
      const otherSlides = slides.filter((_, i) => i !== fromIdx)
      let wrongOpt = ''
      for (const other of otherSlides.sort(() => Math.random() - 0.5)) {
        const otherPoints = Array.isArray(other.key_points) && other.key_points.filter(p => p.length > 1).length > 0
          ? other.key_points.filter(p => p.length > 1)
          : splitSentences(other.explanation ?? '')
        const candidate = otherPoints.find(p => p !== correct)
        if (candidate) { wrongOpt = candidate; break }
      }

      if (!wrongOpt) {
        if (fromIdx >= slides.length - 1) { advanceFromQuiz() }
        else { setSlideIndex(fromIdx + 1); setCheckedSentences([]); setAutoProgress(0) }
        return
      }

      const aIsCorrect = Math.random() > 0.5
      setMiniQ({
        id:          q.id,
        text:        '다음 중 올바른 설명은?',
        explanation: correct,
        options:     aIsCorrect ? [correct, wrongOpt] : [wrongOpt, correct],
        answerIdx:   aIsCorrect ? 0 : 1,
      })
      setShowMiniQuiz(true)
      return
    }
    const correct = q.options[q.answer_index?.[0] ?? 0]
    const wrongOptions = q.options.filter((_, i) => !q.answer_index?.includes(i))

    // options 부족 시 퀴즈 건너뛰고 다음 슬라이드로
    if (!correct || wrongOptions.length === 0) {
      if (fromIdx >= slides.length - 1) {
        advanceFromQuiz()
      } else {
        setSlideIndex(fromIdx + 1)
        setCheckedSentences([])
        setAutoProgress(0)
      }
      return
    }

    const wrongOpt = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
    const aIsCorrect = Math.random() > 0.5
    setMiniQ({
      id: q.id,
      text: q.question,
      explanation: q.explanation,
      options: aIsCorrect ? [correct, wrongOpt] : [wrongOpt, correct],
      answerIdx: aIsCorrect ? 0 : 1,
    })
    setShowMiniQuiz(true)
  }

  const handleNextSlide = () => {
    if (!allChecked && slideMode === 'manual') return
    setCheckedSentences([])
    triggerMiniQuiz(slideIndex)
  }

  const handleMiniConfirm = () => {
    if (miniSelected === null) { showToast('문제를 풀어주세요'); return }
    if (miniConfirmed || !miniQ) return
    setMiniConfirmed(true)
    const correct = miniSelected === miniQ.answerIdx
    miniTotalRef.current   += 1
    if (correct) miniCorrectRef.current += 1
    fetch('/api/v1/mini-quiz-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId:  localStorage.getItem(SUBJECT_KEY) ?? '',
        questionId: miniQ.id,
        correct,
        userId: session?.user?.id ?? '',
        certId,
      }),
    }).catch(() => {})
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2000)
  }

  const toggleMode = () => {
    const next = slideMode === 'manual' ? 'auto' : 'manual'
    setSlideMode(next)
    localStorage.setItem(MODE_KEY, next)
    setAutoProgress(0)
    setCheckedSentences([])
  }

  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX
    isDragging.current = true
  }
  const onDragEnd = (clientX: number) => {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = clientX - dragStartX.current
    if (Math.abs(delta) < 50) return
    if (delta < 0 && slideIndex < slides.length - 1) {
      if (slideMode === 'manual' && !allChecked) { showToast('모든 항목을 체크해주세요'); return }
      if (showMiniQuiz) return
      triggerMiniQuiz(slideIndex)
    } else if (delta > 0 && slideIndex > 0) {
      setSlideIndex((si) => si - 1); setCheckedSentences([]); setAutoProgress(0)
    }
  }

  /* touch */
  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientX)
  const onTouchEnd   = (e: React.TouchEvent) => onDragEnd(e.changedTouches[0].clientX)

  /* mouse (PC) */
  const onMouseDown  = (e: React.MouseEvent) => onDragStart(e.clientX)
  const onMouseUp    = (e: React.MouseEvent) => onDragEnd(e.clientX)
  const onMouseLeave = () => { isDragging.current = false; dragStartX.current = 0 }

  /* arrow button helpers */
  const goPrev = () => { if (slideIndex > 0) { setSlideIndex((si) => si - 1); setCheckedSentences([]); setAutoProgress(0) } }
  const goNext = () => {
    if (slideIndex < slides.length - 1) {
      if (slideMode === 'manual' && !allChecked) { showToast('모든 항목을 체크해주세요'); return }
      if (showMiniQuiz) return
      triggerMiniQuiz(slideIndex)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMemorizer  = style === 'memorizer'
  const currentSlide = slides[slideIndex]

  const parsed = currentSlide?.explanation
    ? parseExplanation(currentSlide.explanation)
    : { prose: '', points: [] }

  const rawPoints = Array.isArray(currentSlide?.key_points)
    ? (currentSlide.key_points as string[]).filter((p: string) => p.length > 1)
    : []
  const sentences = rawPoints.length > 0
    ? rawPoints
    : splitSentences(currentSlide?.explanation ?? '')

  const allChecked = slides.length > 0 && sentences.length === 0
    ? false
    : sentences.length > 0
      && checkedSentences.length === sentences.length
      && checkedSentences.every((v) => v === true)

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => subjectId ? router.push(`/chapters/${subjectId}${certQuery}`) : router.back()}
            className="flex items-center gap-1 text-[13px] text-[#6B6B6B]"
          >
            <ChevronLeft size={16} /> 챕터 목록
          </button>

          {/* Manual / Auto toggle */}
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
              slideMode === 'auto'
                ? 'bg-[#00A651] text-white'
                : 'bg-[#F5F5F3] text-[#6B6B6B] border border-[#E5E5E5]'
            }`}
          >
            {slideMode === 'manual' ? '🖐️ 수동' : '▶️ 자동'}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {certLabel && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A]">
              {certLabel}
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={isMemorizer
              ? { backgroundColor: '#378ADD20', color: '#378ADD' }
              : { backgroundColor: '#63992220', color: '#639922' }}
          >
            {isMemorizer ? '🧠 암기형' : '💡 이해형'}
          </span>
        </div>

        {/* Breadcrumb */}
        {subjectName && (
          <p className="text-[11px] text-[#ADADAD] mb-0.5">{subjectName} › {chapterTitle}</p>
        )}
        <h1 className="text-[18px] font-black text-[#1A1A1A]">{chapterTitle}</h1>
      </div>

      {/* Slide counter */}
      {slides.length > 0 && (
        <div className="flex items-center justify-center pt-3">
          <span className="text-[12px] text-[#ADADAD]">
            {slides.length}개 중 {slideIndex + 1}번째
          </span>
        </div>
      )}

      {/* Slide area */}
      <div
        className="flex-1 overflow-hidden p-4 flex flex-col relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
      >
        {/* Arrow buttons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={slideIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm disabled:opacity-20 transition-opacity"
            >
              <ChevronLeft size={16} className="text-[#6B6B6B]" />
            </button>
            <button
              onClick={goNext}
              disabled={slideIndex === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm disabled:opacity-20 transition-opacity"
            >
              <ArrowRight size={16} className="text-[#6B6B6B]" />
            </button>
          </>
        )}
        {slides.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-[48px] mb-3">📚</div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">{chapterTitle}</p>
            {courseDesc && (
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed px-4">{courseDesc}</p>
            )}
          </div>
        ) : (
          <>
            {/* Main slide card */}
            <div className="flex-1 bg-white rounded-2xl border border-[#E5E5E5] p-5 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-[#00A651]/10 flex items-center justify-center text-[12px] font-black text-[#00A651] flex-shrink-0">
                  {slideIndex + 1}
                </div>
                <span className="text-[11px] text-[#ADADAD] font-medium">학습 내용</span>
              </div>

              <p className="text-[15px] font-bold text-[#1A1A1A] mb-4 leading-snug flex-shrink-0">
                {currentSlide ? toSlideTitle(currentSlide.question) : ''}
              </p>

              <div className="flex-1 overflow-y-auto">
                {/* 영상 */}
                {chapterVideoUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden bg-[#1A1A1A]">
                    <video
                      src={chapterVideoUrl}
                      controls
                      playsInline
                      className="w-full"
                      style={{ maxHeight: '220px', objectFit: 'contain' }}
                    />
                  </div>
                )}

                {/* 이미지 */}
                {chapterImageUrl && !chapterVideoUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chapterImageUrl}
                      alt="학습 이미지"
                      className="w-full object-contain rounded-xl"
                      style={{ maxHeight: '220px' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}

                {/* 음성 */}
                {chapterAudioUrl && (
                  <div className="mb-3">
                    <audio controls src={chapterAudioUrl} className="w-full" />
                  </div>
                )}

                {parsed.prose && (
                  <div className="mb-4 p-3 bg-[#F5F5F3] rounded-xl">
                    <p className="text-[11px] font-bold text-[#00A651] mb-2">📖 학습 내용</p>
                    <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{parsed.prose}</p>
                  </div>
                )}
                {sentences.length > 0 && (
                  <p className="text-[11px] font-bold text-[#ADADAD] mb-2">✅ 핵심 포인트 체크</p>
                )}
                {sentences.length > 0 ? (
                  <div className="space-y-2">
                    {sentences.map((sentence, i) => {
                      const isChecked = checkedSentences[i] ?? false
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (slideMode !== 'manual') return
                            setCheckedSentences((prev) => {
                              const next = new Array(sentences.length).fill(false)
                              prev.forEach((v, idx) => { next[idx] = v })
                              next[i] = !next[i]
                              return next
                            })
                          }}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            isChecked ? 'border-[#639922] bg-[#63992210]' : 'border-[#E5E5E5] bg-[#F5F5F3]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            isChecked ? 'bg-[#639922] border-[#639922]' : 'border-[#ADADAD]'
                          }`}>
                            {isChecked && <Check size={11} className="text-white" />}
                          </div>
                          <span className={`text-[13px] leading-relaxed ${isChecked ? 'text-[#639922]' : 'text-[#1A1A1A]'}`}>
                            {sentence}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 text-[#ADADAD] text-[13px]">
                    내용을 준비 중입니다
                  </div>
                )}
              </div>
            </div>

            {/* Progress bars */}
            <div className="flex items-center gap-1.5 px-1 py-3 flex-shrink-0">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i > slideIndex && slideMode === 'manual' && !allChecked) { showToast('모든 항목을 체크해주세요'); return }
                    setSlideIndex(i); setCheckedSentences([]); setAutoProgress(0)
                  }}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    i <= slideIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Auto timer bar */}
      {slideMode === 'auto' && !showMiniQuiz && slides.length > 0 && (
        <div className="h-1 bg-[#E5E5E5] flex-shrink-0">
          <div
            className="h-full bg-[#00A651] transition-none"
            style={{ width: `${autoProgress}%` }}
          />
        </div>
      )}

      {/* Bottom button */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-[#E5E5E5]">
        {slides.length === 0 ? (
          <button
            onClick={() => router.push(`/test/${chapterId}${certQuery}`)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            <Zap size={18} /> 챕터 테스트
          </button>
        ) : slideMode === 'manual' ? (
          <button
            onClick={handleNextSlide}
            disabled={!allChecked}
            className={`w-full py-4 rounded-2xl text-[16px] font-bold transition-all ${
              allChecked ? 'bg-[#00A651] text-white' : 'bg-[#E5E5E5] text-[#ADADAD]'
            }`}
          >
            확인 퀴즈
          </button>
        ) : (
          <div className="w-full py-4 text-center text-[14px] text-[#6B6B6B] font-medium">
            ▶️ 자동 학습 중... ({slideIndex + 1}/{slides.length})
          </div>
        )}
      </div>

      {/* ══════════ Completion Screen ══════════ */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F5F3] px-6">
          <div className="text-[72px] mb-6">🎉</div>
          <h2 className="text-[26px] font-black text-[#1A1A1A] mb-2">학습 완료!</h2>
          <p className="text-[15px] text-[#6B6B6B] mb-1">{chapterTitle}</p>
          <p className="text-[13px] text-[#ADADAD] mb-6">총 {slides.length}개 슬라이드를 완료했어요</p>
          <div className="w-full max-w-sm mb-4 flex justify-center">
            <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
          </div>
          <button
            onClick={() => router.push(`/test/${chapterId}${certQuery}`)}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            <Zap size={18} /> 챕터 테스트
          </button>
          <button
            onClick={() => {
              setShowComplete(false)
              setSlideIndex(0)
              setCheckedSentences([])
              setAutoProgress(0)
              miniCorrectRef.current = 0
              miniTotalRef.current   = 0
            }}
            className="mt-3 text-[13px] text-[#ADADAD] underline"
          >
            다시 복습하기
          </button>
        </div>
      )}

      {/* ══════════ Toast ══════════ */}
      {toastMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-[#1A1A1A]/90 text-white text-[14px] font-medium rounded-2xl shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* ══════════ Mini Quiz Panel ══════════ */}
      {showMiniQuiz && miniQ && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />

            <button
              onClick={() => setShowMiniQuiz(false)}
              className="absolute top-6 right-6 text-[12px] text-[#888] flex items-center gap-1"
            >
              📖 학습 내용 보기
            </button>

            <h2 className="text-[18px] font-black text-[#1A1A1A] mb-4">확인 퀴즈 💡</h2>
            <p className="text-[15px] font-semibold text-[#1A1A1A] mb-5 leading-snug">
              {miniQ.text}
            </p>

            {/* 보기 A / B */}
            <div className="space-y-3 mb-5">
              {([0, 1] as const).map((idx) => {
                const label     = idx === 0 ? 'A' : 'B'
                const isCorrect = miniConfirmed && idx === miniQ.answerIdx
                const isWrong   = miniConfirmed && miniSelected === idx && idx !== miniQ.answerIdx
                // 원문자(①②③④) 제거 후 표시
                const optionText = miniQ.options[idx].replace(/^[①②③④⑤]\s*/, '').trim()
                return (
                  <button
                    key={idx}
                    onClick={() => !miniConfirmed && setMiniSelected(idx)}
                    className={`w-full flex items-start gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                      miniConfirmed
                        ? isCorrect
                          ? 'border-[#639922] bg-[#63992210]'
                          : isWrong
                            ? 'border-[#E24B4A] bg-[#E24B4A10]'
                            : 'border-[#E5E5E5] bg-[#F5F5F3] opacity-50'
                        : miniSelected === idx
                          ? 'border-[#00A651] bg-[#00A651]/5'
                          : 'border-[#E5E5E5]'
                    }`}
                  >
                    <span className={`text-[13px] font-black flex-shrink-0 w-5 ${
                      miniConfirmed
                        ? isCorrect ? 'text-[#639922]'
                          : isWrong ? 'text-[#E24B4A]'
                          : 'text-[#ADADAD]'
                        : miniSelected === idx ? 'text-[#00A651]' : 'text-[#ADADAD]'
                    }`}>
                      {label}.
                    </span>
                    <span className={`flex-1 text-[14px] font-medium leading-relaxed ${
                      miniConfirmed
                        ? isCorrect ? 'text-[#639922]'
                          : isWrong ? 'text-[#E24B4A]'
                          : 'text-[#ADADAD]'
                        : 'text-[#1A1A1A]'
                    }`}>
                      {optionText}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Result */}
            {miniConfirmed ? (
              <>
                <div className={`p-4 rounded-2xl mb-4 ${
                  miniSelected === miniQ.answerIdx ? 'bg-[#63992210] border border-[#63992230]' : 'bg-[#E24B4A10] border border-[#E24B4A20]'
                }`}>
                  <p className={`text-[14px] font-bold mb-1.5 ${
                    miniSelected === miniQ.answerIdx ? 'text-[#639922]' : 'text-[#E24B4A]'
                  }`}>
                    {miniSelected === miniQ.answerIdx ? '정확해요! ✅' : '아쉬워요!'}
                  </p>
                  {miniQ.explanation && (
                    <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{miniQ.explanation}</p>
                  )}
                </div>

                {miniSelected === miniQ.answerIdx ? (
                  <button
                    onClick={() => {
                      const pendingSlide = slides[pendingSlideIdxRef.current]
                      if (pendingSlide?.exam_years && pendingSlide.exam_years.length > 0) {
                        setShowRelatedQuestions(true)
                      } else {
                        advanceFromQuiz()
                      }
                    }}
                    className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
                  >
                    {pendingSlideIdxRef.current >= slides.length - 1 ? '학습 완료 🎉' : '다음 슬라이드 →'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowMiniQuiz(false)
                        setSlideIndex(pendingSlideIdxRef.current)
                        setCheckedSentences([])
                        setAutoProgress(0)
                        setMiniSelected(null)
                        setMiniConfirmed(false)
                      }}
                      className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
                    >
                      다시 학습하기
                    </button>
                    <button
                      onClick={() => {
                        const pendingSlide = slides[pendingSlideIdxRef.current]
                        if (pendingSlide?.exam_years && pendingSlide.exam_years.length > 0) {
                          setShowRelatedQuestions(true)
                        } else {
                          advanceFromQuiz()
                        }
                      }}
                      className="w-full py-3.5 border-2 border-[#E5E5E5] text-[#6B6B6B] rounded-2xl text-[14px] font-semibold"
                    >
                      그래도 계속하기
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={handleMiniConfirm}
                className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                확인
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ Related Questions Bottom Sheet ══════════ */}
      {showRelatedQuestions && (() => {
        const pendingSlide = slides[pendingSlideIdxRef.current]
        return (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => { setShowRelatedQuestions(false); advanceFromQuiz() }}
            />

            <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[80vh] overflow-y-auto">
              {/* Handle */}
              <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              {/* 제목 */}
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">이 내용에서 출제된 문제</p>
              {pendingSlide?.question && (
                <p className="text-[12px] text-[#ADADAD] mb-4 leading-snug">{pendingSlide.question}</p>
              )}

              {/* 문제 카드 목록 */}
              <div className="space-y-3 mb-6">
                {/* 현재 슬라이드 자체가 oral 문제 카드 역할 */}
                {pendingSlide && (
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                    {/* 뱃지 */}
                    {pendingSlide.star_rating === 5 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: '#FAECE7', color: '#993C1D' }}>
                        🔥 필수 학습
                      </span>
                    )}
                    {pendingSlide.star_rating === 4 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                        ⭐ 단골 출제
                      </span>
                    )}
                    {/* 출제 연도 */}
                    {pendingSlide.exam_years && pendingSlide.exam_years.length > 0 && (
                      <p className="text-[11px] text-[#5F5E5A] mb-1.5">
                        출제 연도: {pendingSlide.exam_years.join(', ')}년
                      </p>
                    )}
                    {/* 문제 텍스트 */}
                    <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{pendingSlide.question}</p>
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <button
                onClick={() => {
                  setShowRelatedQuestions(false)
                  advanceFromQuiz()
                }}
                className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                {pendingSlideIdxRef.current >= slides.length - 1 ? '학습 완료 🎉' : '다음 슬라이드로 →'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
