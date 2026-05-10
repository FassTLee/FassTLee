'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft } from 'lucide-react'

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

  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent]     = useState(0)
  const [selected, setSelected]   = useState<number | null>(null)
  const [records, setRecords]     = useState<AnswerRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [certLabel, setCertLabel] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    const cert = localStorage.getItem(CERT_KEY)
    if (cert && CERT_LABELS[cert]) setCertLabel(CERT_LABELS[cert])
    fetchQuestions()
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('chapter_questions')
      .select('id, question, options, answer_index, explanation')
      .eq('chapter_id', chapterId)
    const raw = data ?? []
    setQuestions(raw.length > 10 ? shuffle(raw).slice(0, 10) : raw)
    setLoading(false)
  }

  const handleNext = () => {
    if (selected === null) return
    const q = questions[current]
    const rec: AnswerRecord = {
      questionId:   q.id,
      question:     q.question,
      options:      q.options,
      answer_index: q.answer_index,
      selected,
      correct:      selected === q.answer_index,
      explanation:  q.explanation,
    }
    const nextRecords = [...records, rec]

    if (current + 1 >= questions.length) {
      localStorage.setItem(RESULT_KEY, JSON.stringify({ chapterId, records: nextRecords }))
      fetch('/api/v1/test-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          subjectId: localStorage.getItem('kinepia_current_subject_id') ?? '',
          records: nextRecords.map((r) => ({ questionId: r.questionId, correct: r.correct })),
          email: session?.user?.email ?? '',
        }),
      }).catch(() => {})
      router.replace(`/report/${chapterId}`)
    } else {
      setRecords(nextRecords)
      setCurrent(current + 1)
      setSelected(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[16px] font-bold text-[#1A1A1A] mb-2">등록된 문제가 없습니다</p>
        <button onClick={() => router.back()} className="text-[14px] text-[#E24B4A]">← 돌아가기</button>
      </div>
    )
  }

  const q        = questions[current]
  const progress = ((current + 1) / questions.length) * 100
  const isLast   = current + 1 >= questions.length

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-[#E5E5E5]">
        <div className="h-full bg-[#E24B4A] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => setShowExitConfirm(true)} className="p-1">
          <ChevronLeft size={20} className="text-[#1A1A1A]" />
        </button>
        <span className="text-[13px] text-[#ADADAD] flex-1">{current + 1} / {questions.length}</span>
        {certLabel && (
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
        {/* Question */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">Q{current + 1}</p>
          <p className="text-[17px] font-bold text-[#1A1A1A] leading-snug">{q.question}</p>
        </div>

        {/* Options — 선택한 보기만 하이라이트, 정답/오답 표시 없음 */}
        <div className="space-y-2.5">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full flex items-center px-4 py-4 rounded-2xl border-2 text-left text-[14px] font-medium transition-all ${
                selected === i
                  ? 'border-[#E24B4A] bg-[#E24B4A]/5 text-[#1A1A1A]'
                  : 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
              }`}
            >
              {cleanOption(opt)}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <button
          onClick={handleNext}
          disabled={selected === null}
          className={`w-full py-4 disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold ${
            isLast ? 'bg-[#1A1A1A]' : 'bg-[#E24B4A]'
          }`}
        >
          {isLast ? '결과 보기' : '다음 문제'}
        </button>
      </div>
    </div>
  )
}
