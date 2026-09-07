'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { track } from '@vercel/analytics'
import { LearningTypeIcon } from '@/components/common/LearningTypeIcon'
import { LEARNING_TYPES, isLearningType, type LearningType } from '@/lib/learning-types'
import { shuffle } from '@/lib/shuffle'

const STYLE_TYPE_KEY = 'kinepia_learning_type'
const GUEST_ID_KEY   = 'kinepia_guest_id'

const GUEST_CLEANUP_KEYS = [
  'landingTestResult',
  'landingTestQuestions',
  'kinepia_learning_type',
  'kinepia_learning_style',
]

interface SurveyQuestion {
  q: string
  options: { text: string; type: LearningType }[]
}

const QUESTIONS: SurveyQuestion[] = [
  {
    q: '새로운 개념을 배울 때 나는?',
    options: [
      { text: '원리와 이유를 끝까지 따져본다', type: 'explorer' },
      { text: '핵심 단어부터 반복해서 익힌다', type: 'repeater' },
      { text: '순서를 정해 단계별로 나아간다', type: 'planner'  },
      { text: '전체를 훑으며 감을 먼저 잡는다', type: 'spotter'  },
    ],
  },
  {
    q: '모르는 내용이 나오면?',
    options: [
      { text: '이해될 때까지 파고든다',              type: 'explorer' },
      { text: '정답을 반복해서 외워둔다',            type: 'repeater' },
      { text: '복습할 날을 정해 표시해둔다',         type: 'planner'  },
      { text: '떠오르는 답을 먼저 고르고 확인한다',  type: 'spotter'  },
    ],
  },
  {
    q: '선호하는 학습 자료는?',
    options: [
      { text: '교재·상세 설명',                   type: 'explorer' },
      { text: '요약본·핵심 정리 노트',            type: 'repeater' },
      { text: '스케줄러·진도 체크리스트',         type: 'planner'  },
      { text: '도표·그림으로 한눈에 보는 자료',   type: 'spotter'  },
    ],
  },
  {
    q: '시험 준비는 보통?',
    options: [
      { text: '원리를 이해하며 오랫동안 준비',   type: 'explorer' },
      { text: '핵심을 여러 번 되짚으며 준비',    type: 'repeater' },
      { text: '날짜별 분량을 정해 준비',          type: 'planner'  },
      { text: '전체 흐름을 잡고 감으로 채우기',  type: 'spotter'  },
    ],
  },
]

// 각 질문의 선택지 순서를 랜덤하게 섞기
function shuffleOptions(questions: SurveyQuestion[]): SurveyQuestion[] {
  return questions.map((q) => ({
    ...q,
    options: shuffle(q.options),
  }))
}

function calcType(votes: LearningType[]): LearningType {
  const count: Record<LearningType, number> = { spotter: 0, planner: 0, repeater: 0, explorer: 0 }
  votes.forEach((v) => { count[v]++ })
  return (Object.keys(count) as LearningType[]).reduce((a, b) => count[a] >= count[b] ? a : b)
}

function SurveyContent() {
  const { status } = useSession()
  const router = useRouter()

  const [questions] = useState<SurveyQuestion[]>(() => shuffleOptions(QUESTIONS))
  const [current, setCurrent]       = useState(0)
  const [votes, setVotes]           = useState<LearningType[]>([])
  const [selected, setSelected]     = useState<LearningType | null>(null)
  const [result, setResult]         = useState<LearningType | null>(null)
  const [saving, setSaving]         = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated') {
      // 로그인 완료 → guest 데이터 자동 병합
      const guestId = localStorage.getItem(GUEST_ID_KEY)
      console.log('[survey] guestId from localStorage:', guestId)

      if (guestId) {
        fetch('/api/auth/convert-guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_id: guestId }),
        })
          .then((r) => r.json())
          .then((data) => {
            console.log('[survey] convert-guest 결과:', data)
            GUEST_CLEANUP_KEYS.forEach((k) => localStorage.removeItem(k))
            console.log('[survey] localStorage guest 키 정리 완료')
          })
          .catch((e) => {
            console.log('[survey] convert-guest 오류:', e)
          })
      }
    }
    // unauthenticated: 아무것도 안 함 → 설문 진행 허용
  }, [status])

  const handleSelect = (type: LearningType) => {
    if (selected || saving) return
    setSelected(type)

    setTimeout(async () => {
      const newVotes = [...votes, type]

      if (current < questions.length - 1) {
        track('survey_step_completed', { step: current + 1 })
        setVotes(newVotes)
        setCurrent(current + 1)
        setSelected(null)
        return
      }

      // 마지막 문항 → 결과 계산 및 저장
      setSaving(true)
      const finalType = calcType(newVotes)

      localStorage.setItem(STYLE_TYPE_KEY, finalType)

      if (status === 'authenticated') {
        try {
          const res = await fetch('/api/v1/learning-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              learning_style: finalType,
              learning_style_answers: newVotes,
              source: 'survey',
            }),
          })
          const json = await res.json()
          if (!json.saved) {
            sessionStorage.setItem('kinepia_style_pending', finalType)
          }
        } catch {
          sessionStorage.setItem('kinepia_style_pending', finalType)
        }
      }

      setResult(finalType)
      setSaving(false)
    }, 350)
  }

  if (status === 'loading' && typeof window !== 'undefined' && !isLearningType(localStorage.getItem(STYLE_TYPE_KEY))) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ─── 결과 화면 ──────────────────────────────────────────────────
  if (result) {
    const meta = LEARNING_TYPES[result]
    return (
      <>
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-sm text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${meta.color}15` }}
            >
              <LearningTypeIcon type={meta.key} size={52} />
            </div>
            <div
              className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
            >
              {meta.badge}
            </div>
            <h2 className="text-[22px] font-black text-[#1A1A1A] mb-2">
              당신은 <span style={{ color: meta.color }}>{meta.label}</span>!
            </h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2">
              학습 유형이 확인됐어요.<br />
              로그인하면 진도와 결과가 저장됩니다.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold mt-6"
            >
              Kinepia 시작하기
            </button>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-6" />
            <p className="text-[16px] font-bold text-[#1A1A1A] text-center mb-1">
              학습 기록을 저장하세요
            </p>
            <p className="text-[12px] text-[#ADADAD] text-center mb-6">
              로그인하면 학습 유형과 진도가 저장됩니다
            </p>

            <button
              onClick={() => signIn('google', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 border border-[#E5E5E5] rounded-2xl text-[14px] font-medium"
            >
              <span>🔍</span> 구글로 시작하기
            </button>

            <button
              onClick={() => signIn('kakao', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 bg-[#FEE500] rounded-2xl text-[14px] font-medium text-[#1A1A1A]"
            >
              <span>💬</span> 카카오로 시작하기
            </button>

            {/* 네이버 로그인 */}
            <button
              onClick={() => signIn('naver', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-[#03C75A] rounded-2xl text-[14px] font-medium text-white"
            >
              <span>N</span> 네이버로 시작하기
            </button>

            <button
              onClick={() => router.push('/trainer/dashboard')}
              className="w-full py-2 text-[12px] text-[#ADADAD] text-center"
            >
              Guest로 Kinepia 시작하기
            </button>
          </div>
        </div>
      )}
      </>
    )
  }

  // ─── 설문 화면 ──────────────────────────────────────────────────
  const q        = questions[current]
  const progress = ((current + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <div className="h-1 bg-[#E5E5E5]">
        <div className="h-full bg-[#00A651] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-[12px] text-[#ADADAD] mb-2">{current + 1} / {questions.length}</div>
            <p className="text-[10px] font-semibold text-[#00A651] tracking-widest uppercase mb-2">
              학습 유형 검사
            </p>
            <h2 className="text-[20px] font-black text-[#1A1A1A] leading-snug">{q.q}</h2>
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(opt.type)}
                disabled={saving || selected !== null}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left text-[14px] font-semibold transition-all
                  ${selected === opt.type
                    ? 'bg-[#00A651]/10 border-[#00A651] text-[#00A651]'
                    : selected !== null
                    ? 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-50'
                    : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                  }`}
              >
                <span className="w-6 h-6 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[11px] font-black text-[#ADADAD] flex-shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt.text}
              </button>
            ))}
          </div>

          {saving && (
            <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-[#ADADAD]">
              <div className="w-4 h-4 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
              유형 분석 중...
            </div>
          )}

          <button
            onClick={() => {
              track('survey_abandoned', { step: current + 1 })
              router.replace('/')
            }}
            className="mt-10 w-full py-3 text-[12px] text-[#ADADAD]"
          >
            건너뛰기 <ChevronRight size={12} className="inline" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LandingSurveyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SurveyContent />
    </Suspense>
  )
}
