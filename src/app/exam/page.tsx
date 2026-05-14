'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronLeft, ChevronRight, LayoutGrid, Clock, X } from 'lucide-react'

const TOTAL_MINUTES  = 160
const _Q_PER_SUBJECT = 20
const PASS_TOTAL     = 96   // 60% of 160
const SUBJECT_PASS_Q = 8    // 40% of 20

const SESSION_1 = ['운동생리학', '건강체력평가', '운동처방론', '운동부하검사']
const SESSION_2 = ['운동상해', '기능해부학', '병태생리학', '스포츠심리학']

interface ExamQuestion {
  id:           string
  question:     string
  options:      string[]
  answer_index: number
  explanation:  string | null
}

interface ExamSubject {
  name:      string
  questions: ExamQuestion[]
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function cleanOption(opt: string): string {
  return opt.replace(/^\s*[①②③④⑤\d]+[.)、]?\s*/, '').trim()
}

export default function ExamPage() {
  const router          = useRouter()
  const { data: session } = useSession()

  const [step, setStep]               = useState<'loading' | 'intro' | 'exam' | 'submitting'>('loading')
  const [subjects, setSubjects]       = useState<ExamSubject[]>([])
  const [answers, setAnswers]         = useState<Record<string, number>>({})
  const [subjectIdx, setSubjectIdx]   = useState(0)
  const [qIdx, setQIdx]               = useState(0)
  const [timeLeft, setTimeLeft]       = useState(TOTAL_MINUTES * 60)
  const [showExit, setShowExit]       = useState(false)
  const [showOverview, setShowOverview] = useState(false)
  const [fetchError, setFetchError]   = useState(false)

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittingRef = useRef(false)

  // ── 문제 로드 ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/v1/exam-questions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const valid = (d.subjects ?? []).filter((s: ExamSubject) => s.questions.length > 0)
        setSubjects(valid)
        setStep('intro')
      })
      .catch(() => { setFetchError(true); setStep('intro') })
  }, [])

  // ── 타이머 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          submit('timeout').catch(console.error)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 브라우저 뒤로가기 경고 ─────────────────────────────────────
  useEffect(() => {
    if (step !== 'exam') return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [step])

  // ── 결과 저장 ────────────────────────────────────────────────────
  const submit = async (reason: 'complete' | 'abandon' | 'timeout') => {
    if (submittingRef.current) return
    submittingRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    setStep('submitting')

    const subjectResults = subjects.map((subj) => {
      const correct = subj.questions.filter((q) => answers[q.id] === q.answer_index).length
      return {
        name:    subj.name,
        score:   correct,
        total:   subj.questions.length,
        passed:  correct >= SUBJECT_PASS_Q,
        answers: subj.questions.map((q) => ({
          questionId:   q.id,
          question:     q.question,
          options:      q.options,
          answer_index: q.answer_index,
          explanation:  q.explanation,
          selected:     answers[q.id] ?? -1,
          correct:      answers[q.id] === q.answer_index,
        })),
      }
    })

    const totalScore     = subjectResults.reduce((s, r) => s + r.score, 0)
    const totalQuestions = subjectResults.reduce((s, r) => s + r.total, 0)
    const hasSubjectFail = subjectResults.some((r) => !r.passed)
    const passed         = !hasSubjectFail && totalScore >= PASS_TOTAL

    const examData = {
      subjects: subjectResults,
      totalScore,
      totalQuestions,
      passed,
      abandoned:     reason !== 'complete',
      timeRemaining: timeLeft,
    }

    localStorage.setItem('examResult', JSON.stringify(examData))

    try {
      await fetch('/api/v1/exam-complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...examData, userId: session?.user?.id ?? null }),
      })
    } catch { /* 저장 실패해도 로컬스토리지에 결과 있음 */ }

    router.replace('/exam/report')
  }

  // ── 내비게이션 ───────────────────────────────────────────────────
  const currentSubj  = subjects[subjectIdx]
  const currentQ     = currentSubj?.questions[qIdx]
  const totalQCount  = subjects.reduce((s, sub) => s + sub.questions.length, 0)
  const globalQNum   = subjects.slice(0, subjectIdx).reduce((s, sub) => s + sub.questions.length, 0) + qIdx + 1
  const totalAnswered = Object.keys(answers).length
  const isFirst      = subjectIdx === 0 && qIdx === 0
  const isLast       = subjectIdx === subjects.length - 1 && qIdx === (currentSubj?.questions.length ?? 1) - 1
  const timeUrgent   = timeLeft > 0 && timeLeft <= 600

  const goNext = () => {
    if (qIdx < (currentSubj?.questions.length ?? 1) - 1) {
      setQIdx((q) => q + 1)
    } else if (subjectIdx < subjects.length - 1) {
      setSubjectIdx((s) => s + 1)
      setQIdx(0)
    }
  }

  const goPrev = () => {
    if (qIdx > 0) {
      setQIdx((q) => q - 1)
    } else if (subjectIdx > 0) {
      const prevLen = subjects[subjectIdx - 1]?.questions.length ?? 1
      setSubjectIdx((s) => s - 1)
      setQIdx(prevLen - 1)
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // LOADING
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // SUBMITTING
  if (step === 'submitting') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
        <p className="text-[15px] font-bold text-[#1A1A1A]">결과 저장 중...</p>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // INTRO
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#F5F5F3]">
        <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
            <ChevronLeft size={16} /> 뒤로
          </button>
          <h1 className="text-[22px] font-black text-[#1A1A1A]">모의고사</h1>
          <p className="text-[13px] text-[#6B6B6B] mt-1">건강운동관리사 실전 모의고사</p>
        </div>

        <div className="p-4 space-y-4 pb-10">

          {/* 교시 안내 */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider mb-3">시험 구성</p>
            <div className="space-y-4">
              {[{ label: '1교시', subjects: SESSION_1 }, { label: '2교시', subjects: SESSION_2 }].map(({ label, subjects: list }) => (
                <div key={label}>
                  <p className="text-[12px] font-bold text-[#1A1A1A] mb-2">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((s) => (
                      <span key={s} className="text-[11px] px-2.5 py-1 bg-[#F5F5F3] rounded-lg text-[#6B6B6B] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 시험 정보 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '총 문항', value: '160문항' },
              { label: '제한 시간', value: '160분' },
              { label: '과목 수', value: '8과목' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-[#E5E5E5] p-3 text-center">
                <p className="text-[10px] text-[#ADADAD] mb-1">{item.label}</p>
                <p className="text-[14px] font-black text-[#1A1A1A]">{item.value}</p>
              </div>
            ))}
          </div>

          {/* 합격 기준 */}
          <div className="bg-[#00A651]/5 border border-[#00A651]/20 rounded-2xl p-4">
            <p className="text-[12px] font-bold text-[#00A651] mb-2.5">합격 기준</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-[#6B6B6B] mt-0.5">·</span>
                <span className="text-[12px] text-[#1A1A1A]">
                  과목별 <strong>40% 이상</strong> (20문항 중 8점 이상)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#6B6B6B] mt-0.5">·</span>
                <span className="text-[12px] text-[#1A1A1A]">
                  전 과목 평균 <strong>60% 이상</strong> (160문항 중 96점 이상)
                </span>
              </div>
              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[#00A651]/15">
                <span className="text-[#E24B4A] mt-0.5">·</span>
                <span className="text-[12px] text-[#E24B4A] font-semibold">과락 1과목이라도 있으면 불합격</span>
              </div>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-2xl p-4">
            <p className="text-[12px] font-bold text-[#1A1A1A] mb-1">⚠️ 주의사항</p>
            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
              시험 도중 나가면 재입장이 불가하며, 현재까지 답한 내용으로 결과가 저장됩니다.
            </p>
          </div>

          {fetchError && (
            <div className="bg-[#E24B4A]/10 border border-[#E24B4A]/20 rounded-2xl p-4 text-center">
              <p className="text-[13px] font-bold text-[#E24B4A]">문제를 불러오지 못했습니다</p>
              <p className="text-[12px] text-[#6B6B6B] mt-1">잠시 후 다시 시도해주세요.</p>
            </div>
          )}

          <button
            onClick={() => setStep('exam')}
            disabled={fetchError || subjects.length === 0}
            className="w-full py-4 bg-[#00A651] disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold"
          >
            시험 시작
          </button>
          <p className="text-[11px] text-[#ADADAD] text-center">무료 · 무제한 응시</p>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // EXAM
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <p className="text-[14px] text-[#6B6B6B]">문제 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#E5E5E5] px-4 pt-12 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowExit(true)}
            className="flex items-center gap-1 text-[13px] text-[#6B6B6B]"
          >
            <X size={16} /> 나가기
          </button>
          <span className="text-[13px] font-bold text-[#1A1A1A]">
            {globalQNum} / {totalQCount}
          </span>
          <button
            onClick={() => setShowOverview(true)}
            className="flex items-center gap-1 text-[13px] text-[#6B6B6B]"
          >
            <LayoutGrid size={15} /> 목록
          </button>
        </div>

        {/* 과목 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
          {subjects.map((subj, i) => (
            <button
              key={subj.name}
              onClick={() => { setSubjectIdx(i); setQIdx(0) }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                i === subjectIdx
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F5F5F3] text-[#6B6B6B]'
              }`}
            >
              {subj.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 문제 영역 ── */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {/* 문제 카드 */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#1A1A1A]/10 rounded-full text-[#1A1A1A]">
              {currentSubj.name}
            </span>
            <span className="text-[10px] text-[#ADADAD]">
              Q{qIdx + 1} / {currentSubj.questions.length}
            </span>
          </div>
          <p className="text-[16px] font-bold text-[#1A1A1A] leading-snug">{currentQ.question}</p>
        </div>

        {/* 보기 */}
        <div className="space-y-2.5">
          {currentQ.options.map((opt, i) => {
            const selected = answers[currentQ.id] === i
            return (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [currentQ.id]: i }))}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                  selected
                    ? 'border-[#00A651] bg-[#00A651]/5'
                    : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[13px] font-black transition-all ${
                  selected
                    ? 'bg-[#00A651] border-[#00A651] text-white'
                    : 'border-[#ADADAD] text-[#ADADAD]'
                }`}>
                  {['①', '②', '③', '④', '⑤'][i] ?? i + 1}
                </span>
                <span className="text-[14px] font-medium flex-1 leading-relaxed text-[#1A1A1A]">
                  {cleanOption(opt)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 하단 바 ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] px-4 pt-2 pb-5 flex-shrink-0">
        <div className={`flex items-center justify-center gap-1.5 mb-2 text-[13px] font-bold ${
          timeUrgent ? 'text-[#E24B4A]' : 'text-[#6B6B6B]'
        }`}>
          <Clock size={14} />
          <span>{formatTime(timeLeft)}</span>
          {timeUrgent && <span className="text-[11px] font-normal">⚠️ 시간 부족</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="flex-1 py-3.5 border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-semibold text-[#1A1A1A] disabled:opacity-30 flex items-center justify-center gap-1"
          >
            <ChevronLeft size={16} /> 이전
          </button>
          {isLast ? (
            <button
              onClick={() => submit('complete').catch(console.error)}
              className="flex-[2] py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
            >
              제출 ({totalAnswered}/{totalQCount})
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex-[2] py-3.5 bg-[#00A651] text-white rounded-2xl text-[14px] font-bold flex items-center justify-center gap-1"
            >
              다음 <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── 나가기 확인 ── */}
      {showExit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-3">
            <div className="text-center">
              <div className="text-[44px] mb-2">⚠️</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">지금 나가시겠습니까?</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                지금 나가면 재입장이 불가합니다.<br />
                결과는 리포트에 기록됩니다.
              </p>
            </div>
            <button
              onClick={() => { setShowExit(false); submit('abandon').catch(console.error) }}
              className="w-full py-3.5 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold"
            >
              나가고 결과 저장
            </button>
            <button
              onClick={() => setShowExit(false)}
              className="w-full py-3 border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-semibold text-[#1A1A1A]"
            >
              계속 시험 보기
            </button>
          </div>
        </div>
      )}

      {/* ── 문제 목록 오버뷰 ── */}
      {showOverview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-4 pt-5 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-black text-[#1A1A1A]">문제 목록</h3>
                <p className="text-[11px] text-[#ADADAD] mt-0.5">
                  답변 완료 {totalAnswered} / {totalQCount}
                </p>
              </div>
              <button onClick={() => setShowOverview(false)}>
                <X size={20} className="text-[#6B6B6B]" />
              </button>
            </div>

            <div className="space-y-4">
              {subjects.map((subj, si) => (
                <div key={subj.name}>
                  <p className="text-[11px] font-bold text-[#ADADAD] mb-2">{subj.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subj.questions.map((q, qi) => {
                      const isAnswered = answers[q.id] !== undefined
                      const isCurrent  = si === subjectIdx && qi === qIdx
                      return (
                        <button
                          key={q.id}
                          onClick={() => { setSubjectIdx(si); setQIdx(qi); setShowOverview(false) }}
                          className={`w-9 h-9 rounded-xl text-[12px] font-bold transition-all ${
                            isCurrent
                              ? 'bg-[#1A1A1A] text-white'
                              : isAnswered
                              ? 'bg-[#00A651]/15 text-[#00A651]'
                              : 'bg-[#F5F5F3] text-[#ADADAD]'
                          }`}
                        >
                          {qi + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#F5F5F3]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-[#00A651]/15" />
                <span className="text-[11px] text-[#6B6B6B]">답변 완료</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-[#F5F5F3]" />
                <span className="text-[11px] text-[#6B6B6B]">미답변</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-[#1A1A1A]" />
                <span className="text-[11px] text-[#6B6B6B]">현재 문제</span>
              </div>
            </div>

            {/* 오버뷰에서도 제출 가능 */}
            <button
              onClick={() => { setShowOverview(false); submit('complete').catch(console.error) }}
              className="w-full mt-4 py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
            >
              제출하기 ({totalAnswered}/{totalQCount})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
