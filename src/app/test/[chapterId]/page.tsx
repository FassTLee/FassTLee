'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Check, X } from 'lucide-react'

const RESULT_KEY = 'kinepia_test_result'

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
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [records, setRecords] = useState<AnswerRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    fetchQuestions()
  }, [status, chapterId])

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('chapter_questions')
      .select('id, question, options, answer_index, explanation')
      .eq('chapter_id', chapterId)
    setQuestions(data ?? [])
    setLoading(false)
  }

  const handleConfirm = () => {
    if (selected === null) return
    setConfirmed(true)
  }

  const handleNext = () => {
    if (selected === null) return
    const q = questions[current]
    const rec: AnswerRecord = {
      questionId: q.id,
      question: q.question,
      options: q.options,
      answer_index: q.answer_index,
      selected,
      correct: selected === q.answer_index,
      explanation: q.explanation,
    }
    const nextRecords = [...records, rec]

    if (current + 1 >= questions.length) {
      // 완료 → 결과 저장 후 리포트
      localStorage.setItem(RESULT_KEY, JSON.stringify({ chapterId, records: nextRecords }))
      router.replace(`/report/${chapterId}`)
    } else {
      setRecords(nextRecords)
      setCurrent(current + 1)
      setSelected(null)
      setConfirmed(false)
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

  const q = questions[current]
  const progress = ((current + 1) / questions.length) * 100
  const isCorrect = confirmed && selected === q.answer_index

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 프로그레스 */}
      <div className="h-1 bg-[#E5E5E5]">
        <div className="h-full bg-[#E24B4A] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft size={20} className="text-[#1A1A1A]" />
        </button>
        <span className="text-[13px] text-[#ADADAD]">{current + 1} / {questions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-36">
        {/* 질문 */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">Q{current + 1}</p>
          <p className="text-[17px] font-bold text-[#1A1A1A] leading-snug">{q.question}</p>
        </div>

        {/* 보기 */}
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            let style = 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
            if (confirmed) {
              if (i === q.answer_index) {
                style = 'border-[#639922] bg-[#63992210] text-[#639922]'
              } else if (i === selected && !isCorrect) {
                style = 'border-[#E24B4A] bg-[#E24B4A10] text-[#E24B4A]'
              } else {
                style = 'border-[#E5E5E5] bg-[#F5F5F3] text-[#ADADAD]'
              }
            } else if (selected === i) {
              style = 'border-[#E24B4A] bg-[#E24B4A]/5 text-[#1A1A1A]'
            }

            return (
              <button
                key={i}
                onClick={() => !confirmed && setSelected(i)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left text-[14px] font-medium transition-all ${style}`}
              >
                <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-[11px] font-black flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1">{opt}</span>
                {confirmed && i === q.answer_index && <Check size={16} className="flex-shrink-0" />}
                {confirmed && i === selected && !isCorrect && <X size={16} className="flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* 해설 */}
        {confirmed && q.explanation && (
          <div
            className={`mt-4 p-4 rounded-2xl border-l-4 ${isCorrect ? 'bg-[#63992210] border-[#639922]' : 'bg-[#E24B4A10] border-[#E24B4A]'}`}
          >
            <p className={`text-[11px] font-bold mb-1 ${isCorrect ? 'text-[#639922]' : 'text-[#E24B4A]'}`}>
              {isCorrect ? '✅ 정답!' : '❌ 오답'} — 해설
            </p>
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{q.explanation}</p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selected === null}
            className="w-full py-4 bg-[#E24B4A] disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold"
          >
            확인
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl text-[16px] font-bold"
          >
            {current + 1 >= questions.length ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  )
}
