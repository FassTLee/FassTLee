'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight as ArrowRight, Check, Zap } from 'lucide-react'

const STYLE_KEY   = 'kinepia_learning_style'
const CERT_KEY    = 'kinepia_selected_cert'
const SUBJECT_KEY = 'kinepia_current_subject_id'
const MODE_KEY    = 'lesson_slide_mode'

const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
}

interface Question {
  id: string
  question: string
  options: string[]
  answer_index: number
  explanation: string | null
  difficulty?: string | null
}

interface Slide {
  id: string
  question: string
  explanation: string | null
}

interface MiniQ {
  id: string
  text: string
  explanation: string | null
  options: [string, string]
  answerIdx: 0 | 1
}

function getShort(text: string, n = 2): string {
  const sentences = text.match(/[^.!?。\n]+[.!?。]?/g) ?? []
  return sentences.slice(0, n).join('').trim()
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
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string

  const [chapterTitle, setChapterTitle] = useState('')
  const [subjectName, setSubjectName]   = useState('')
  const [_courseDesc, setCourseDesc]    = useState<string | null>(null)
  const [questions, setQuestions]       = useState<Question[]>([])
  const [slides, setSlides]             = useState<Slide[]>([])
  const [style, setStyle]               = useState<'memorizer' | 'conceptualizer'>('conceptualizer')
  const [certLabel, setCertLabel]       = useState('')
  const [subjectId, setSubjectId]       = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)

  /* ── Slide navigation ───────────────────────── */
  const [slideIndex, setSlideIndex]     = useState(0)
  const [slideMode, setSlideMode]       = useState<'manual' | 'auto'>('manual')
  const [checked, setChecked]           = useState(false)
  const [autoProgress, setAutoProgress] = useState(0)

  /* ── Mini quiz ──────────────────────────────── */
  const [showMiniQuiz, setShowMiniQuiz]   = useState(false)
  const [miniQ, setMiniQ]                 = useState<MiniQ | null>(null)
  const [miniSelected, setMiniSelected]   = useState<0 | 1 | null>(null)
  const [miniConfirmed, setMiniConfirmed] = useState(false)
  // tracks which slide index triggered the current mini quiz
  const pendingSlideRef = useRef(0)

  /* ── Completion screen ──────────────────────── */
  const [showComplete, setShowComplete] = useState(false)

  /* ── Swipe (touch + mouse) ──────────────────── */
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

  const fetchData = async () => {
    const [{ data: ch }, { data: qs }] = await Promise.all([
      supabase.from('chapters').select('id, title, course_id').eq('id', chapterId).single(),
      supabase.from('chapter_questions')
        .select('id, question, options, answer_index, explanation, difficulty')
        .eq('chapter_id', chapterId),
    ])

    if (ch) {
      setChapterTitle(ch.title)
      if (ch.course_id) {
        const { data: course } = await supabase
          .from('courses').select('id, subject_id, description').eq('id', ch.course_id).single()
        if (course?.description) setCourseDesc(course.description)
        if (course?.subject_id) {
          const { data: subj } = await supabase
            .from('subjects').select('name').eq('id', course.subject_id).single()
          if (subj?.name) setSubjectName(subj.name)
        }
      }
    }

    const allQ = qs ?? []
    setQuestions(allQ)

    const isM = (localStorage.getItem(STYLE_KEY) ?? 'conceptualizer') === 'memorizer'
    const maxSlides = isM ? 3 : 5
    setSlides(allQ.slice(0, maxSlides).map((q) => ({
      id: q.id,
      question: q.question,
      explanation: q.explanation,
    })))

    setLoading(false)
  }

  /* ── Auto mode timer ───────────────────────────────── */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (slideMode !== 'auto' || showMiniQuiz || showComplete || loading) return

    setAutoProgress(0)
    timerRef.current = setInterval(() => {
      setAutoProgress((p) => Math.min(p + 2, 100))
    }, 100)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slideMode, slideIndex, showMiniQuiz, showComplete, loading])

  /* ── Advance when timer completes ─────────────────── */
  useEffect(() => {
    if (autoProgress < 100 || slideMode !== 'auto' || showMiniQuiz) return
    setAutoProgress(0)
    // Always trigger mini quiz per-slide (navigation handled in handleMiniNext)
    triggerMiniQuiz(slideIndex)
  }, [autoProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Mini quiz trigger (called per slide) ─────────── */
  const triggerMiniQuiz = (currentIdx: number) => {
    pendingSlideRef.current = currentIdx
    const easyQs = questions.filter((q) => q.difficulty === 'easy')
    const pool = easyQs.length > 0 ? easyQs : questions

    if (pool.length === 0) {
      // No questions available — skip mini quiz, advance directly
      advanceAfterQuiz(currentIdx)
      return
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const q = shuffled[0]
    const correct = q.options[q.answer_index]
    let wrongOpt: string
    if (shuffled.length >= 2) {
      const wrong = shuffled[1]
      wrongOpt = wrong.options[wrong.answer_index]
    } else {
      const others = q.options.filter((_, i) => i !== q.answer_index)
      wrongOpt = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : correct
    }
    const aIsCorrect = Math.random() > 0.5
    setMiniQ({
      id: q.id,
      text: q.question,
      explanation: q.explanation,
      options: aIsCorrect ? [correct, wrongOpt] : [wrongOpt, correct],
      answerIdx: aIsCorrect ? 0 : 1,
    })
    setMiniSelected(null)
    setMiniConfirmed(false)
    setShowMiniQuiz(true)
  }

  /* ── After quiz dismissed: go to next slide or complete ── */
  const advanceAfterQuiz = (fromIdx: number) => {
    setShowMiniQuiz(false)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setChecked(false)
    setAutoProgress(0)

    if (fromIdx >= slides.length - 1) {
      // Last slide done → completion screen
      setShowComplete(true)
    } else {
      setSlideIndex(fromIdx + 1)
    }
  }

  /* ── "Next" button inside mini quiz ──────────────── */
  const handleMiniNext = () => {
    advanceAfterQuiz(pendingSlideRef.current)
  }

  /* ── "Retry this slide" inside mini quiz ─────────── */
  const handleMiniRetry = () => {
    setShowMiniQuiz(false)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setChecked(false)
    setAutoProgress(0)
    // Stay on current slide
  }

  /* ── Manual: checkbox confirmed → mini quiz ──────── */
  const handleNextSlide = () => {
    if (!checked && slideMode === 'manual') return
    setChecked(false)
    triggerMiniQuiz(slideIndex)
  }

  const handleMiniConfirm = () => {
    if (miniSelected === null || miniConfirmed || !miniQ) return
    setMiniConfirmed(true)
    const correct = miniSelected === miniQ.answerIdx
    fetch('/api/v1/test-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId: localStorage.getItem(SUBJECT_KEY) ?? '',
        records: [{ questionId: miniQ.id, correct }],
      }),
    }).catch(() => {})
  }

  const toggleMode = () => {
    const next = slideMode === 'manual' ? 'auto' : 'manual'
    setSlideMode(next)
    localStorage.setItem(MODE_KEY, next)
    setAutoProgress(0)
    setChecked(false)
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
      setSlideIndex((si) => si + 1); setChecked(false); setAutoProgress(0)
    } else if (delta > 0 && slideIndex > 0) {
      setSlideIndex((si) => si - 1); setChecked(false); setAutoProgress(0)
    }
  }

  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientX)
  const onTouchEnd   = (e: React.TouchEvent) => onDragEnd(e.changedTouches[0].clientX)
  const onMouseDown  = (e: React.MouseEvent) => onDragStart(e.clientX)
  const onMouseUp    = (e: React.MouseEvent) => onDragEnd(e.clientX)
  const onMouseLeave = () => { isDragging.current = false }

  const goPrev = () => { if (slideIndex > 0) { setSlideIndex((si) => si - 1); setChecked(false); setAutoProgress(0) } }
  const goNext = () => { if (slideIndex < slides.length - 1) { setSlideIndex((si) => si + 1); setChecked(false); setAutoProgress(0) } }

  if (loading || slides.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMemorizer  = style === 'memorizer'
  const currentSlide = slides[slideIndex]
  const isLastSlide  = slideIndex === slides.length - 1

  const getContent = (expl: string | null) => {
    if (!expl) return ''
    return isMemorizer ? getShort(expl, 2) : expl
  }

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => subjectId ? router.push(`/chapters/${subjectId}`) : router.back()}
            className="flex items-center gap-1 text-[13px] text-[#6B6B6B]"
          >
            <ChevronLeft size={16} /> 챕터 목록
          </button>

          <button
            onClick={toggleMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
              slideMode === 'auto'
                ? 'bg-[#E24B4A] text-white'
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

        <>

            {/* Overview strip — first slide only */}
            {slideIndex === 0 && subjectName && (
              <div className="bg-[#E24B4A]/5 border border-[#E24B4A]/20 rounded-2xl p-3 mb-3 flex-shrink-0">
                <p className="text-[11px] font-bold text-[#E24B4A]">{subjectName} › {chapterTitle}</p>
              </div>
            )}

            {/* Main slide card */}
            <div className="flex-1 bg-white rounded-2xl border border-[#E5E5E5] p-5 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-[#E24B4A]/10 flex items-center justify-center text-[12px] font-black text-[#E24B4A] flex-shrink-0">
                  {slideIndex + 1}
                </div>
                <span className="text-[11px] text-[#ADADAD] font-medium">학습 내용</span>
              </div>

              <p className="text-[15px] font-bold text-[#1A1A1A] mb-4 leading-snug flex-shrink-0">
                {currentSlide ? toSlideTitle(currentSlide.question) : ''}
              </p>

              <div className="flex-1 overflow-y-auto">
                {getContent(currentSlide?.explanation ?? null) ? (
                  <div className="bg-[#F5F5F3] rounded-xl p-4">
                    <p className="text-[11px] font-bold text-[#ADADAD] mb-2">💡 핵심 설명</p>
                    <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
                      {getContent(currentSlide?.explanation ?? null)}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 text-[#ADADAD] text-[13px]">
                    내용을 준비 중입니다
                  </div>
                )}
              </div>

              {/* Manual mode checkbox */}
              {slideMode === 'manual' && (
                <button
                  onClick={() => setChecked((c) => !c)}
                  className={`mt-4 flex-shrink-0 flex items-center gap-2 py-2.5 px-4 rounded-xl border-2 transition-all ${
                    checked ? 'border-[#639922] bg-[#63992210]' : 'border-[#E5E5E5]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    checked ? 'bg-[#639922] border-[#639922]' : 'border-[#ADADAD]'
                  }`}>
                    {checked && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`text-[13px] font-semibold ${checked ? 'text-[#639922]' : 'text-[#6B6B6B]'}`}>
                    {checked ? '학습 완료!' : '학습 완료로 표시하기'}
                  </span>
                </button>
              )}
            </div>

            {/* Progress bars */}
            <div className="flex items-center gap-1.5 px-1 py-3 flex-shrink-0">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setSlideIndex(i); setChecked(false); setAutoProgress(0) }}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    i <= slideIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
        </>
      </div>

      {/* Auto timer bar */}
      {slideMode === 'auto' && !showMiniQuiz && slides.length > 0 && (
        <div className="h-1 bg-[#E5E5E5] flex-shrink-0">
          <div
            className="h-full bg-[#E24B4A] transition-none"
            style={{ width: `${autoProgress}%` }}
          />
        </div>
      )}

      {/* Bottom button */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-[#E5E5E5]">
        {slideMode === 'manual' ? (
          /* Manual: requires checkbox first */
          <button
            onClick={handleNextSlide}
            disabled={!checked}
            className={`w-full py-4 rounded-2xl text-[16px] font-bold transition-all ${
              checked
                ? 'bg-[#E24B4A] text-white'
                : 'bg-[#E5E5E5] text-[#ADADAD]'
            }`}
          >
            {isLastSlide ? '확인 퀴즈 →' : '다음 슬라이드 →'}
          </button>
        ) : (
          /* Auto: progress bar drives flow; show neutral label */
          <div className="w-full py-4 rounded-2xl bg-[#F5F5F3] text-[14px] text-center text-[#ADADAD] font-medium">
            ▶️ 자동 학습 중... ({slideIndex + 1}/{slides.length})
          </div>
        )}
      </div>

      {/* ══════════ Mini Quiz Panel ══════════ */}
      {showMiniQuiz && miniQ && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />

            {/* Slide progress pill */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E24B4A]/10 text-[#E24B4A]">
                슬라이드 {pendingSlideRef.current + 1} / {slides.length} 확인 퀴즈
              </span>
            </div>

            <h2 className="text-[18px] font-black text-[#1A1A1A] mb-4">확인 퀴즈 💡</h2>
            <p className="text-[15px] font-semibold text-[#1A1A1A] mb-5 leading-snug">
              {miniQ.text}
            </p>

            {/* A / B choices */}
            <div className="space-y-3 mb-5">
              {(['A', 'B'] as const).map((label, i) => {
                const idx = i as 0 | 1
                const isCorrect = miniConfirmed && idx === miniQ.answerIdx
                const isWrong   = miniConfirmed && miniSelected === idx && idx !== miniQ.answerIdx
                return (
                  <button
                    key={label}
                    onClick={() => !miniConfirmed && setMiniSelected(idx)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                      miniConfirmed
                        ? isCorrect
                          ? 'border-[#639922] bg-[#63992210]'
                          : isWrong
                            ? 'border-[#E24B4A] bg-[#E24B4A10]'
                            : 'border-[#E5E5E5] bg-[#F5F5F3] opacity-50'
                        : miniSelected === idx
                          ? 'border-[#E24B4A] bg-[#E24B4A]/5'
                          : 'border-[#E5E5E5]'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[13px] font-black flex-shrink-0 ${
                      miniConfirmed
                        ? isCorrect ? 'border-[#639922] text-[#639922]'
                          : isWrong ? 'border-[#E24B4A] text-[#E24B4A]'
                          : 'border-[#ADADAD] text-[#ADADAD]'
                        : miniSelected === idx ? 'border-[#E24B4A] text-[#E24B4A]' : 'border-[#ADADAD] text-[#ADADAD]'
                    }`}>
                      {label}
                    </span>
                    <span className={`flex-1 text-[14px] font-medium ${
                      miniConfirmed
                        ? isCorrect ? 'text-[#639922]'
                          : isWrong ? 'text-[#E24B4A]'
                          : 'text-[#ADADAD]'
                        : 'text-[#1A1A1A]'
                    }`}>
                      {miniQ.options[idx]}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Result + navigation */}
            {miniConfirmed ? (
              <>
                {/* Result box */}
                <div className={`p-4 rounded-2xl mb-4 ${
                  miniSelected === miniQ.answerIdx
                    ? 'bg-[#63992210] border border-[#63992230]'
                    : 'bg-[#E24B4A10] border border-[#E24B4A20]'
                }`}>
                  <p className={`text-[14px] font-bold mb-1.5 ${
                    miniSelected === miniQ.answerIdx ? 'text-[#639922]' : 'text-[#E24B4A]'
                  }`}>
                    {miniSelected === miniQ.answerIdx ? '정확해요! ✅' : '아쉬워요! ❌'}
                  </p>
                  {miniQ.explanation && (
                    <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{miniQ.explanation}</p>
                  )}
                </div>

                {/* Primary: advance */}
                <button
                  onClick={handleMiniNext}
                  className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold mb-2"
                >
                  {pendingSlideRef.current >= slides.length - 1
                    ? '학습 완료 🎉'
                    : `다음 슬라이드 (${pendingSlideRef.current + 2}/${slides.length}) →`}
                </button>

                {/* Secondary: retry this slide if wrong */}
                {miniSelected !== miniQ.answerIdx && (
                  <button
                    onClick={handleMiniRetry}
                    className="w-full py-3 border-2 border-[#E5E5E5] text-[#6B6B6B] rounded-2xl text-[13px] font-semibold"
                  >
                    이 슬라이드 다시 보기
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleMiniConfirm}
                disabled={miniSelected === null}
                className="w-full py-4 bg-[#E24B4A] disabled:opacity-40 text-white rounded-2xl text-[15px] font-bold"
              >
                확인
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ 학습 완료 화면 ══════════ */}
      {showComplete && (
        <div className="fixed inset-0 z-50 bg-[#F5F5F3] flex flex-col items-center justify-center px-6">
          {/* Back button */}
          <button
            onClick={() => subjectId ? router.push(`/chapters/${subjectId}`) : router.back()}
            className="absolute top-12 left-5 flex items-center gap-1 text-[13px] text-[#6B6B6B]"
          >
            <ChevronLeft size={16} /> 챕터 목록
          </button>

          <div className="text-center w-full max-w-sm">
            <div className="text-[72px] mb-4 animate-bounce">🎉</div>
            <h2 className="text-[26px] font-black text-[#1A1A1A] mb-2">학습 완료!</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-2">
              {chapterTitle}
            </p>
            <p className="text-[13px] text-[#ADADAD] mb-10">
              슬라이드 {slides.length}개를 모두 학습했어요.<br/>
              이제 테스트로 실력을 확인해보세요!
            </p>

            {/* Score summary pills */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="bg-white rounded-2xl border border-[#E5E5E5] px-5 py-3 text-center">
                <p className="text-[11px] text-[#ADADAD] mb-0.5">학습 슬라이드</p>
                <p className="text-[20px] font-black text-[#1A1A1A]">{slides.length}개</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E5E5E5] px-5 py-3 text-center">
                <p className="text-[11px] text-[#ADADAD] mb-0.5">확인 퀴즈</p>
                <p className="text-[20px] font-black text-[#1A1A1A]">{slides.length}회</p>
              </div>
            </div>

            {/* Primary CTA: Test */}
            <button
              onClick={() => router.push(`/test/${chapterId}`)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-bold shadow-lg mb-3"
            >
              <Zap size={18} /> 테스트 시작하기
            </button>

            {/* Secondary: re-study */}
            <button
              onClick={() => {
                setShowComplete(false)
                setSlideIndex(0)
                setChecked(false)
                setAutoProgress(0)
              }}
              className="w-full py-3 text-[13px] text-[#ADADAD] font-medium"
            >
              처음부터 다시 학습하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
