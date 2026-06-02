'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft } from 'lucide-react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'

const RESULT_KEY = 'kinepia_test_result'
const CERT_KEY   = 'kinepia_selected_cert'

const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/** Remove leading numeric/alpha prefixes. Keeps circled numbers ①②③④⑤ intact. */
function cleanOption(opt: string): string {
  return opt
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
    .replace(/^\s*\d+[.)、]\s*/, '')
    .replace(/^\s*[A-Da-d][.)]\s*/, '')
    .trim()
}

interface Question {
  id: string
  question: string
  options: string[]
  answer_index: number
  explanation: string | null
  image_url: string | null
  reference_text: string | null
  question_type: string | null
}

interface AnswerRecord {
  questionId: string
  question: string
  options: string[]
  answer_index: number
  selected: number
  correct: boolean
  explanation: string | null
}

export default function TestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string

  const [questions, setQuestions]         = useState<Question[]>([])
  const [current, setCurrent]             = useState(0)
  const [selected, setSelected]           = useState<number | null>(null)
  const [answers, setAnswers]             = useState<Record<number, number>>({})
  const [showReview, setShowReview]       = useState(false)
  const [loading, setLoading]             = useState(true)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [certLabel, setCertLabel]         = useState('')
  const [reportUrl, setReportUrl]         = useState<string | null>(null)
  const [countdown, setCountdown]         = useState(3)
  const [userAnswers, setUserAnswers]         = useState<Record<string, string>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    const cert = localStorage.getItem(CERT_KEY)
    if (cert && CERT_LABELS[cert]) setCertLabel(CERT_LABELS[cert])
    fetchQuestions()
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 전면 광고 카운트다운
  useEffect(() => {
    if (!reportUrl) return
    if (countdown <= 0) { router.replace(reportUrl); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [reportUrl, countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = async () => {
    const { data: basicData } = await supabase
      .from('chapter_questions')
      .select('id, question, options, answer_index, explanation, image_url, reference_text, question_type')
      .eq('chapter_id', chapterId)
      .eq('question_type', 'basic')
      .not('answer_index', 'is', null)

    const { data: oralData } = await supabase
      .from('chapter_questions')
      .select('id, question, options, answer_index, explanation, image_url, reference_text, question_type')
      .eq('chapter_id', chapterId)
      .eq('question_type', 'oral')

    const basicQ = shuffle(basicData ?? []).slice(0, 5)
    const oralQ  = shuffle(oralData  ?? []).slice(0, 5)
    setQuestions([...basicQ, ...oralQ])
    setLoading(false)
  }

  const handleNext = () => {
    if (selected === null) return
    const nextAnswers = { ...answers, [current]: selected }
    setAnswers(nextAnswers)

    if (current + 1 >= questions.length) {
      setShowReview(true)
    } else {
      setCurrent(current + 1)
      setSelected(nextAnswers[current + 1] ?? null)
    }
  }

  const handlePrev = () => {
    if (current === 0) return
    if (selected !== null) setAnswers((prev) => ({ ...prev, [current]: selected }))
    const prevIdx = current - 1
    setCurrent(prevIdx)
    setSelected(answers[prevIdx] ?? null)
  }

  const handleSubmit = () => {
    const finalRecords: AnswerRecord[] = questions.map((q, idx) => {
      const isOral = q.question_type === 'oral'
      const sel    = answers[idx] ?? -1
      return {
        questionId:   q.id,
        question:     q.question,
        options:      q.options,
        answer_index: q.answer_index,
        selected:     sel,
        correct:      isOral ? sel === 0 : sel === q.answer_index,
        explanation:  q.explanation ?? '',
      }
    })
    localStorage.setItem(RESULT_KEY, JSON.stringify({ chapterId, records: finalRecords }))
    fetch('/api/v1/test-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId: localStorage.getItem('kinepia_current_subject_id') ?? '',
        records: finalRecords.map((r) => ({ questionId: r.questionId, correct: r.correct })),
        userId: session?.user?.id ?? '',
      }),
    }).catch(() => {})
    if (session) {
      setReportUrl(`/report/${chapterId}`)
    } else {
      router.replace(`/report/${chapterId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 테스트 완료 후 전면 광고 화면
  if (reportUrl) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center p-6 gap-6">
        <p className="text-[13px] text-white/50">잠시 후 결과가 표시됩니다</p>
        <div className="rounded-2xl overflow-hidden bg-white flex items-center justify-center" style={{ width: 300, height: 250 }}>
          <KakaoAdFit unit="DAN-lIQXmkoBNuojGX5A" width={300} height={250} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-[14px] text-white/70">{countdown}초 후 자동으로 이동합니다</p>
          <button
            onClick={() => router.replace(reportUrl)}
            className="px-6 py-2.5 rounded-full border border-white/30 text-[13px] text-white/80"
          >
            바로 이동
          </button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[16px] font-bold text-[#1A1A1A] mb-2">등록된 문제가 없습니다</p>
        <button onClick={() => router.back()} className="text-[14px] text-[#00A651]">← 돌아가기</button>
      </div>
    )
  }

  // 검토 화면
  if (showReview) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
        <div className="bg-white border-b border-[#E5E5E5] px-5 pt-10 pb-3 flex items-center gap-3">
          <button onClick={() => setShowReview(false)} className="p-1">
            <ChevronLeft size={20} className="text-[#1A1A1A]" />
          </button>
          <span className="text-[15px] font-bold text-[#1A1A1A]">내 답 확인</span>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pb-48">
          {questions.map((qItem, idx) => (
            <div key={idx} className="border border-[#E5E5E5] rounded-2xl p-4 mb-3 bg-white">
              <p className="text-[11px] text-[#ADADAD] mb-1">{idx + 1}번 문제</p>
              <p className="text-[13px] font-medium text-[#1A1A1A] mb-2 line-clamp-2">{qItem.question}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#ADADAD]">내 답:</span>
                {answers[idx] !== undefined ? (
                  <span className="text-[12px] font-bold text-[#1A1A1A]">
                    {cleanOption(qItem.options[answers[idx]])}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#FF3B30]">미답변</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5] space-y-2">
          <button
            onClick={() => {
              const firstUnanswered = questions.findIndex((_, i) => answers[i] === undefined)
              const target = firstUnanswered >= 0 ? firstUnanswered : 0
              setCurrent(target)
              setSelected(answers[target] ?? null)
              setShowReview(false)
            }}
            className="w-full py-3 rounded-2xl border border-[#E5E5E5] text-[14px] font-bold text-[#1A1A1A]"
          >
            다시 검토하기
          </button>
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-2xl bg-[#00A651] text-white text-[14px] font-bold"
          >
            제출하기
          </button>
        </div>
      </div>
    )
  }

  const q        = questions[current]
  const isOral   = q.question_type === 'oral'
  const progress = ((current + 1) / questions.length) * 100
  // 하단 버튼 비활성 조건
  const isNextDisabled = selected === null || (isOral && !revealedAnswers.has(q.id))

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-[#E5E5E5]">
        <div className="h-full bg-[#00A651] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => setShowExitConfirm(true)} className="p-1">
          <ChevronLeft size={20} className="text-[#1A1A1A]" />
        </button>
        <span className="text-[13px] text-[#ADADAD] flex-1">{current + 1} / {questions.length}</span>
        {isOral && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A]">
            주관식
          </span>
        )}
        {!isOral && certLabel && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A]">
            {certLabel}
          </span>
        )}
      </div>

      {/* Exit confirm popup */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
            <h2 className="text-[17px] font-black text-[#1A1A1A] text-center">테스트를 중단하시겠습니까?</h2>
            <p className="text-[13px] text-[#6B6B6B] text-center">진행 내용이 저장되지 않습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] font-semibold text-[#1A1A1A]"
              >
                계속하기
              </button>
              <button
                onClick={() => router.push(`/lesson/${chapterId}`)}
                className="flex-1 py-3 rounded-xl bg-[#E24B4A] text-white text-[14px] font-bold"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 pb-36">
        {/* 지문 */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">Q{current + 1}</p>
          <p className="text-[17px] font-bold text-[#1A1A1A] leading-snug">{q.question}</p>
        </div>

        {/* 보기 (reference_text) */}
        {q.reference_text?.trim() && (
          <div className="mb-4 bg-[#F5F5F3] border border-[#E5E5E5] rounded-2xl p-4">
            <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">보기</p>
            <p className="text-[14px] text-[#1A1A1A] leading-relaxed whitespace-pre-line">{q.reference_text}</p>
          </div>
        )}

        {/* 그림 (image_url) */}
        {q.image_url?.trim() && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-[#E5E5E5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={q.image_url}
              alt="문제 이미지"
              className="w-full object-contain"
              style={{ maxHeight: '260px' }}
            />
          </div>
        )}

        {/* ── 주관식(oral) UI ── */}
        {isOral ? (
          <div className="space-y-3">
            {!revealedAnswers.has(q.id) ? (
              <>
                <textarea
                  value={userAnswers[q.id] ?? ''}
                  onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="답변을 입력하세요..."
                  rows={4}
                  className="w-full p-3 mt-3 border border-[#E5E5E5] rounded-xl text-[14px] resize-none focus:outline-none focus:border-[#1A1A1A]"
                />
                <button
                  onClick={() => setRevealedAnswers(prev => { const s = new Set(prev); s.add(q.id); return s })}
                  disabled={!userAnswers[q.id]?.trim()}
                  className="w-full py-3 mt-2 bg-[#1A1A1A] disabled:bg-[#E5E5E5] disabled:text-[#ADADAD] text-white rounded-xl text-[14px] font-bold"
                >
                  모범답안 확인
                </button>
              </>
            ) : (
              <>
                {/* 내 답변 */}
                <div className="bg-[#F5F5F3] rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold text-[#ADADAD] mb-1">내 답변</p>
                  <p className="text-[13px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                    {userAnswers[q.id]}
                  </p>
                </div>
                {/* 모범답안 */}
                <div className="bg-[#00A651]/10 border border-[#00A651]/20 rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold text-[#00A651] mb-1">모범답안</p>
                  <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{q.explanation}</p>
                </div>
                {/* 자기평가 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelected(0)}
                    className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all ${
                      selected === 0 ? 'bg-[#00A651] text-white' : 'bg-[#00A651]/10 text-[#00A651]'
                    }`}
                  >
                    알았다 ✓
                  </button>
                  <button
                    onClick={() => setSelected(1)}
                    className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all ${
                      selected === 1 ? 'bg-[#E24B4A] text-white' : 'bg-[#F5F5F3] text-[#1A1A1A]'
                    }`}
                  >
                    오답노트에 저장
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── 4지선다(basic) UI ── */
          <div>
            {q.options.map((opt, i) => (
              <div
                key={i}
                className="flex items-center gap-[10px] mb-2 cursor-pointer"
                onClick={() => setSelected(i)}
              >
                {/* 원형 번호 뱃지 */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 transition-colors ${
                  selected === i
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-[#D0D0D0] text-[#888]'
                }`}>
                  {i + 1}
                </div>
                {/* 보기 텍스트 박스 */}
                <div className={`flex-1 px-4 py-[11px] rounded-2xl text-[13px] text-left transition-colors ${
                  selected === i
                    ? 'border-[1.5px] border-[#00A651] bg-[#f0fbf4] text-[#1A1A1A]'
                    : 'border-[0.5px] border-[#E5E5E5] bg-white text-[#1A1A1A]'
                } border`}>
                  {cleanOption(opt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={current === 0}
            className="flex-1 py-3 rounded-2xl border border-[#E5E5E5] text-[14px] font-bold text-[#1A1A1A] disabled:opacity-30"
          >
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className="flex-1 py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold disabled:opacity-40"
          >
            {current + 1 === questions.length ? '검토하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
