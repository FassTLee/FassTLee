'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, X } from 'lucide-react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'

const RESULT_KEY  = 'kinepia_test_result'
const SUBJECT_KEY = 'kinepia_current_subject_id'

interface AnswerRecord {
  questionId:   string
  question:     string
  options:      string[]
  answer_index:  number[]
  selected:      number
  correct:       boolean
  explanation:   string | null
  content_type?: string
  question_format?: string | null
  user_answer?:  string
}

interface TestResult {
  chapterId: string
  records:   AnswerRecord[]
}

export default function ReviewPage() {
  const { status } = useSession()
  const router     = useRouter()
  const params     = useParams()
  const chapterId  = params.chapterId as string

  const [wrong, setWrong]       = useState<AnswerRecord[]>([])
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    const raw = localStorage.getItem(RESULT_KEY)
    if (raw) {
      const parsed: TestResult = JSON.parse(raw)
      if (parsed.chapterId === chapterId) {
        setWrong(parsed.records.filter((r) => !r.correct))
      }
    }
    setSubjectId(localStorage.getItem(SUBJECT_KEY))
    setLoading(false)
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button
          onClick={() => router.push(`/report/${chapterId}`)}
          className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3"
        >
          <ChevronLeft size={16} /> 학습 리포트
        </button>
        <h1 className="text-[20px] font-black text-[#1A1A1A]">오답노트</h1>
        {wrong.length > 0 && (
          <p className="text-[13px] text-[#ADADAD] mt-1">{wrong.length}문제</p>
        )}
      </div>

      {/* AdFit 배너 */}
      <div className="flex justify-center bg-white border-b border-[#E5E5E5] py-2">
        <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
      </div>

      {/* 오답 목록 */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">
        {wrong.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-3">🎉</div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">오답이 없습니다!</p>
            <p className="text-[13px] text-[#ADADAD]">모든 문제를 맞혔어요.</p>
          </div>
        ) : (
          wrong.map((r, idx) => (
            <div key={r.questionId} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
              {/* 문제 */}
              <div className="flex items-start gap-2 mb-3">
                <X size={14} className="text-[#E24B4A] mt-0.5 flex-shrink-0" />
                <p className="text-[13px] font-semibold text-[#1A1A1A]">
                  Q{idx + 1}. {r.question}
                </p>
              </div>

              {/* 선택지 / 주관식 */}
              {r.question_format === 'short_answer' ? (
                <div className="mt-2 text-sm">
                  <p className="text-[11px] font-bold text-[#ADADAD] mb-1">내 답변</p>
                  <p className="text-[12px] text-[#1A1A1A] leading-relaxed mb-3">
                    {r.user_answer?.trim() ? r.user_answer : <span className="text-[#FF3B30]">미답변</span>}
                  </p>
                  <p className="text-[11px] font-bold text-[#00A651] mb-1">모범답안</p>
                  <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{r.explanation}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 mb-3">
                    {(r.options ?? []).map((opt, oi) => (
                      <div
                        key={oi}
                        className={`px-3 py-2 rounded-xl text-[12px] ${
                          r.answer_index?.includes(oi)
                            ? 'bg-[#63992215] text-[#639922] font-semibold'
                            : oi === r.selected
                            ? 'bg-[#E24B4A10] text-[#E24B4A] line-through'
                            : 'text-[#ADADAD]'
                        }`}
                      >
                        {r.answer_index?.includes(oi) && (
                          <span className="text-[10px] font-bold mr-1">✓ 정답</span>
                        )}
                        {oi === r.selected && !r.answer_index?.includes(oi) && (
                          <span className="text-[10px] font-bold mr-1">내 선택</span>
                        )}
                        {opt}
                      </div>
                    ))}
                  </div>

                  {/* 해설 */}
                  {r.explanation && (
                    <div className="bg-[#F5F5F3] rounded-xl p-3">
                      <p className="text-[11px] font-bold text-[#ADADAD] mb-1">해설</p>
                      <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <button
          onClick={() => router.push(subjectId ? `/chapters/${subjectId}` : '/trainer/dashboard?tab=classroom')}
          className="w-full py-4 border-2 border-[#E5E5E5] rounded-2xl text-[15px] font-bold text-[#1A1A1A]"
        >
          강의실로 돌아가기
        </button>
      </div>
    </div>
  )
}
