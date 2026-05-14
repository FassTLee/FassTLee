'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, X, ChevronRight, Lock } from 'lucide-react'

const EXAM_RESULT_KEY = 'examResult'

interface QuestionRecord {
  id: string
  question: string
  options: string[]
  answer_index: number
  selected: number | null
  explanation: string | null
}

interface SubjectResult {
  name: string
  score: number
  total: number
  passed: boolean
  questions: QuestionRecord[]
}

interface ExamResult {
  subjects: SubjectResult[]
  totalScore: number
  totalQuestions: number
  passed: boolean
  abandoned: boolean
  timeRemaining: number
}

function cleanOption(opt: string): string {
  return opt.replace(/^[①②③④⑤⑥]\s*/, '').trim()
}

export default function ExamReportPage() {
  const router = useRouter()
  const { status } = useSession()
  const [result, setResult] = useState<ExamResult | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null)

  // isSubscribed: 구독 여부 (추후 실제 구독 상태로 교체)
  const isSubscribed = false

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    const raw = localStorage.getItem(EXAM_RESULT_KEY)
    if (!raw) { router.replace('/exam'); return }
    try {
      setResult(JSON.parse(raw))
    } catch {
      router.replace('/exam')
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { subjects, totalScore, totalQuestions, passed, abandoned } = result
  const pct = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Hero */}
      <div className={`px-5 pt-14 pb-8 text-center ${passed ? 'bg-[#1A1A1A]' : 'bg-white border-b border-[#E5E5E5]'}`}>
        {abandoned && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-3 ${
            passed ? 'bg-white/10 text-white/60' : 'bg-[#F5A623]/10 text-[#F5A623]'
          }`}>
            중도 이탈
          </div>
        )}
        <div className={`text-[13px] font-bold mb-1 ${passed ? 'text-white/50' : 'text-[#ADADAD]'}`}>
          모의고사 결과
        </div>
        <div
          className="text-[56px] font-black leading-none mb-2"
          style={{ color: passed ? '#7bc629' : '#E24B4A' }}
        >
          {passed ? '합격' : '불합격'}
        </div>
        <div className={`text-[16px] font-semibold mb-1 ${passed ? 'text-white/70' : 'text-[#6B6B6B]'}`}>
          {totalScore} / {totalQuestions} 문제 정답
        </div>
        <div className={`text-[13px] ${passed ? 'text-white/40' : 'text-[#ADADAD]'}`}>
          정답률 {pct}%
        </div>

        {/* Pass criteria reminder */}
        <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] ${
          passed ? 'bg-white/10 text-white/50' : 'bg-[#F5F5F3] text-[#ADADAD]'
        }`}>
          합격 기준: 전체 60% 이상 + 과목별 40% 이상
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-4">

        {/* ── 과목별 결과 (무료 공개) ── */}
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider px-1 mb-2">
            과목별 합격 여부
          </p>
          <div className="bg-white rounded-2xl border border-[#E5E5E5] divide-y divide-[#F5F5F3]">
            {subjects.map((sub, idx) => {
              const subPct = sub.total > 0 ? Math.round((sub.score / sub.total) * 100) : 0
              return (
                <div key={idx} className="flex items-center px-4 py-3.5 gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    sub.passed ? 'bg-[#63992215]' : 'bg-[#E24B4A]/10'
                  }`}>
                    {sub.passed
                      ? <Check size={13} className="text-[#639922]" />
                      : <X    size={13} className="text-[#E24B4A]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{sub.name}</p>
                    <p className="text-[11px] text-[#ADADAD] mt-0.5">
                      {sub.score}/{sub.total}문제 · {subPct}%
                      {!sub.passed && subPct < 40 && (
                        <span className="ml-1 text-[#E24B4A] font-bold">과락</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-[13px] font-bold flex-shrink-0 ${
                    sub.passed ? 'text-[#639922]' : 'text-[#E24B4A]'
                  }`}>
                    {sub.passed ? '합격' : '불합격'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 오답 상세 (유료) ── */}
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider px-1 mb-2">
            과목별 오답 확인
          </p>

          {!isSubscribed ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
              <div className="text-[36px] mb-2">🔒</div>
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">구독 전용 기능</p>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed mb-4">
                과목별 오답 해설은 구독 후 확인할 수 있어요.<br />
                1주일 무료 체험으로 모든 기능을 열어보세요!
              </p>
              <button className="w-full py-3 bg-[#00A651] text-white rounded-2xl text-[14px] font-bold">
                1주일 무료 체험
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((sub, idx) => {
                const wrong = sub.questions.filter(
                  (q) => q.selected !== null && q.selected !== q.answer_index
                )
                const isOpen = expandedSubject === idx

                return (
                  <div key={idx} className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
                    <button
                      onClick={() => setExpandedSubject(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#1A1A1A]">{sub.name}</span>
                        {wrong.length > 0 && (
                          <span className="px-2 py-0.5 bg-[#E24B4A]/10 text-[#E24B4A] text-[10px] font-bold rounded-full">
                            오답 {wrong.length}
                          </span>
                        )}
                        {wrong.length === 0 && (
                          <span className="px-2 py-0.5 bg-[#63992215] text-[#639922] text-[10px] font-bold rounded-full">
                            전부 정답
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-[#ADADAD] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isOpen && wrong.length > 0 && (
                      <div className="border-t border-[#F5F5F3] p-4 space-y-4">
                        {wrong.map((q) => (
                          <div key={q.id}>
                            <div className="flex items-start gap-2 mb-3">
                              <X size={13} className="text-[#E24B4A] mt-0.5 flex-shrink-0" />
                              <p className="text-[13px] font-semibold text-[#1A1A1A] leading-relaxed">{q.question}</p>
                            </div>
                            <div className="space-y-1.5 mb-3">
                              {q.options.map((opt, oi) => (
                                <div
                                  key={oi}
                                  className={`px-3 py-2 rounded-xl text-[12px] ${
                                    oi === q.answer_index
                                      ? 'bg-[#63992215] text-[#639922] font-semibold'
                                      : oi === q.selected
                                      ? 'bg-[#E24B4A10] text-[#E24B4A] line-through'
                                      : 'text-[#ADADAD]'
                                  }`}
                                >
                                  {cleanOption(opt)}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <div className="bg-[#F5F5F3] rounded-xl p-3">
                                <p className="text-[11px] font-bold text-[#ADADAD] mb-1">해설</p>
                                <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isOpen && wrong.length === 0 && (
                      <div className="border-t border-[#F5F5F3] px-4 py-5 text-center">
                        <p className="text-[13px] text-[#639922] font-bold">🎉 모두 정답입니다!</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Lock hint for free users */}
        {!isSubscribed && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F5F5F3] rounded-xl">
            <Lock size={12} className="text-[#ADADAD] flex-shrink-0" />
            <p className="text-[11px] text-[#ADADAD]">
              과목별 40% 미만 과목은 해당 챕터를 집중 복습해보세요.
            </p>
          </div>
        )}

      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5] space-y-2">
        <button
          onClick={() => {
            localStorage.removeItem(EXAM_RESULT_KEY)
            router.push('/exam')
          }}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
        >
          다시 응시 <ChevronRight size={16} />
        </button>
        <button
          onClick={() => router.push('/trainer/dashboard?tab=classroom')}
          className="w-full py-3.5 border-2 border-[#111111] bg-white rounded-2xl text-[14px] font-semibold text-[#111111]"
        >
          강의실로
        </button>
      </div>
    </div>
  )
}
