'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'

const RESULT_KEY  = 'kinepia_test_result'
const SUBJECT_KEY = 'kinepia_current_subject_id'

interface AnswerRecord {
  questionId: string
  question: string
  options: string[]
  answer_index: number
  selected: number
  correct: boolean
  explanation: string | null
}

interface TestResult {
  chapterId: string
  records: AnswerRecord[]
}

// TODO: replace with real subscription check
const isSubscribed = false

export default function ReportPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string

  const [result, setResult] = useState<TestResult | null>(null)
  const [nextChapterId, setNextChapterId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSubscribePopup, setShowSubscribePopup] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    const raw = localStorage.getItem(RESULT_KEY)
    if (!raw) { router.replace('/select-subject'); return }
    setResult(JSON.parse(raw))
    setSubjectId(localStorage.getItem(SUBJECT_KEY))
    fetchNextChapter()
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNextChapter = async () => {
    const { data: chapter } = await supabase
      .from('chapters')
      .select('course_id, order_index')
      .eq('id', chapterId)
      .single()

    if (chapter) {
      const { data: siblings } = await supabase
        .from('chapters')
        .select('id, order_index')
        .eq('course_id', chapter.course_id)
        .order('order_index', { ascending: true })

      if (siblings) {
        const idx = siblings.findIndex((c) => c.id === chapterId)
        if (idx !== -1 && idx + 1 < siblings.length) {
          setNextChapterId(siblings[idx + 1].id)
        }
      }
    }
    setLoading(false)
  }

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const total   = result.records.length
  const correct = result.records.filter((r) => r.correct).length
  const score   = total > 0 ? Math.round((correct / total) * 100) : 0
  const wrong   = result.records.filter((r) => !r.correct)
  const passed  = score >= 60

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button
          onClick={() => subjectId ? router.push(`/chapters/${subjectId}`) : router.push('/trainer/dashboard')}
          className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3"
        >
          <ChevronLeft size={16} /> 챕터 목록
        </button>
        <h1 className="text-[20px] font-black text-[#1A1A1A]">테스트 결과</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-4">
        {/* Score card — always visible */}
        <div className={`rounded-2xl p-6 text-center ${passed ? 'bg-[#1A1A1A]' : 'bg-white border border-[#E5E5E5]'}`}>
          <div className="text-[48px] font-black mb-1" style={{ color: passed ? '#fff' : '#E24B4A' }}>
            {score}점
          </div>
          <div className={`text-[14px] font-semibold mb-3 ${passed ? 'text-white/60' : 'text-[#ADADAD]'}`}>
            {correct} / {total} 문제 정답
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ${
            passed ? 'bg-[#639922]/20 text-[#7bc629]' : 'bg-[#E24B4A]/10 text-[#E24B4A]'
          }`}>
            {passed ? <><Check size={13} /> 통과</> : <><X size={13} /> 재도전 권장</>}
          </div>
        </div>

        {/* Wrong answers — blurred for free users */}
        {wrong.length > 0 && (
          <div className="relative">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider px-1 mb-2">
              오답 해설 ({wrong.length}문제)
            </p>
            <div className={`space-y-3 ${!isSubscribed ? 'blur-sm pointer-events-none select-none' : ''}`}>
              {wrong.map((r) => (
                <div key={r.questionId} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <X size={14} className="text-[#E24B4A] mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{r.question}</p>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {r.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`px-3 py-2 rounded-xl text-[12px] ${
                          oi === r.answer_index
                            ? 'bg-[#63992215] text-[#639922] font-semibold'
                            : oi === r.selected
                            ? 'bg-[#E24B4A10] text-[#E24B4A] line-through'
                            : 'text-[#ADADAD]'
                        }`}
                      >
                        {oi + 1}. {opt}
                      </div>
                    ))}
                  </div>
                  {r.explanation && (
                    <div className="bg-[#F5F5F3] rounded-xl p-3">
                      <p className="text-[11px] font-bold text-[#ADADAD] mb-1">해설</p>
                      <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overlay for free users */}
            {!isSubscribed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pt-8">
                <div className="text-[32px]">🔒</div>
                <p className="text-[13px] font-bold text-[#1A1A1A] text-center">
                  상세 분석은 구독 후 이용 가능합니다
                </p>
                <button
                  onClick={() => setShowSubscribePopup(true)}
                  className="bg-[#E24B4A] text-white px-6 py-3 rounded-2xl text-[14px] font-bold shadow-lg"
                >
                  전체 분석 보기
                </button>
              </div>
            )}
          </div>
        )}

        {wrong.length === 0 && (
          <div className="bg-[#63992210] border border-[#63992230] rounded-2xl p-5 text-center">
            <div className="text-[32px] mb-2">🎉</div>
            <p className="text-[14px] font-bold text-[#639922]">완벽해요! 모두 정답입니다</p>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5] space-y-2">
        {nextChapterId && (
          <button
            onClick={() => router.push(`/lesson/${nextChapterId}`)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold"
          >
            다음 챕터 <ChevronRight size={16} />
          </button>
        )}
        <button
          onClick={() => router.push('/trainer/dashboard')}
          className="w-full py-3.5 border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-semibold text-[#6B6B6B]"
        >
          대시보드로
        </button>
      </div>

      {/* Subscribe popup */}
      {showSubscribePopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
            <div className="text-center">
              <div className="text-[44px] mb-2">📊</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">전체 오답 분석</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                구독하면 모든 오답 해설과<br />
                상세 분석 리포트를 볼 수 있어요!
              </p>
            </div>
            <button className="w-full py-3.5 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold">
              1주일 무료 체험
            </button>
            <button
              onClick={() => setShowSubscribePopup(false)}
              className="w-full py-2.5 text-[13px] text-[#ADADAD] font-medium"
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
