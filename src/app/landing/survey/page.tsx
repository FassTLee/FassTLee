'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'

const STYLE_KEY      = 'kinepia_learning_style'
const STYLE_TYPE_KEY = 'kinepia_learning_type'
const GUEST_ID_KEY   = 'kinepia_guest_id'

const GUEST_CLEANUP_KEYS = [
  'kinepia_guest_id',
  'landingTestResult',
  'landingTestQuestions',
  'kinepia_learning_type',
  'kinepia_learning_style',
]

type LearningType = 'conceptualizer' | 'memorizer' | 'planner' | 'intensive'

const LESSON_STYLE_MAP: Record<LearningType, 'memorizer' | 'conceptualizer'> = {
  conceptualizer: 'conceptualizer',
  planner:        'conceptualizer',
  memorizer:      'memorizer',
  intensive:      'memorizer',
}

const TYPE_META: Record<LearningType, { label: string; icon: string; color: string; badge: string }> = {
  conceptualizer: { label: '이해형',  icon: '/assets/icons/user/user-learning-conceptual.svg',  color: '#639922', badge: '원리 탐구 학습자' },
  memorizer:      { label: '암기형',  icon: '/assets/icons/user/user-learning-memory.svg',      color: '#378ADD', badge: '핵심 반복 학습자' },
  planner:        { label: '계획형',  icon: '/assets/icons/user/user-learning-planner.svg',     color: '#9B59B6', badge: '체계적 전략 학습자' },
  intensive:      { label: '강제형',  icon: '/assets/icons/user/user-learning-intensive.svg',   color: '#E24B4A', badge: '집중 몰입 학습자' },
}

interface SurveyQuestion {
  q: string
  options: { text: string; type: LearningType }[]
}

const QUESTIONS: SurveyQuestion[] = [
  {
    q: '새로운 내용을 배울 때 나는?',
    options: [
      { text: '원리와 이유를 이해하며 깊이 파고든다', type: 'conceptualizer' },
      { text: '핵심 키워드 위주로 반복 암기한다',     type: 'memorizer'      },
      { text: '순서대로 계획을 세워 단계별로 공부',   type: 'planner'        },
      { text: '일단 빠르게 훑고 나중에 몰아서 집중',  type: 'intensive'      },
    ],
  },
  {
    q: '모르는 내용이 나왔을 때 나는?',
    options: [
      { text: '이해될 때까지 끝까지 파고든다',        type: 'conceptualizer' },
      { text: '정답을 반복해서 외워버린다',           type: 'memorizer'      },
      { text: '복습 날짜를 정해 따로 표시해둔다',     type: 'planner'        },
      { text: '일단 넘기고 나중에 한꺼번에 처리',     type: 'intensive'      },
    ],
  },
  {
    q: '공부할 때 선호하는 자료는?',
    options: [
      { text: '교재·상세 설명 위주',                type: 'conceptualizer' },
      { text: '요약본·핵심 정리 노트',               type: 'memorizer'      },
      { text: '스케줄러·진도 체크리스트',             type: 'planner'        },
      { text: '기출 문제·빠른 정답 풀이',             type: 'intensive'      },
    ],
  },
  {
    q: '시험 준비 스타일에 가장 가까운 것은?',
    options: [
      { text: '꾸준히 이해하며 오랫동안 준비',        type: 'conceptualizer' },
      { text: '핵심 포인트 반복 암기 위주',           type: 'memorizer'      },
      { text: '날짜별 분량 계획을 철저히 세우기',     type: 'planner'        },
      { text: '시험 직전 집중 몰아치기',             type: 'intensive'      },
    ],
  },
]

function calcType(votes: LearningType[]): LearningType {
  const count: Record<LearningType, number> = { conceptualizer: 0, memorizer: 0, planner: 0, intensive: 0 }
  votes.forEach((v) => { count[v]++ })
  return (Object.keys(count) as LearningType[]).reduce((a, b) => count[a] >= count[b] ? a : b)
}

function SurveyContent() {
  const { status } = useSession()
  const router = useRouter()

  const [current, setCurrent]     = useState(0)
  const [votes, setVotes]         = useState<LearningType[]>([])
  const [selected, setSelected]   = useState<LearningType | null>(null)
  const [result, setResult]       = useState<LearningType | null>(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    // 로그인 완료 → guest 데이터 자동 병합
    const guestId = localStorage.getItem(GUEST_ID_KEY)
    console.log('[survey] guestId from localStorage:', guestId)
    if (!guestId) return

    fetch('/api/auth/convert-guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guestId }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log('[survey] convert-guest 결과:', data)
        // 병합 성공 여부와 무관하게 localStorage 정리
        GUEST_CLEANUP_KEYS.forEach((k) => localStorage.removeItem(k))
        console.log('[survey] localStorage guest 키 정리 완료')
      })
      .catch((e) => {
        console.log('[survey] convert-guest 오류:', e)
      })
  }, [status, router])

  const handleSelect = (type: LearningType) => {
    if (selected || saving) return
    setSelected(type)

    setTimeout(async () => {
      const newVotes = [...votes, type]

      if (current < QUESTIONS.length - 1) {
        setVotes(newVotes)
        setCurrent(current + 1)
        setSelected(null)
        return
      }

      // 마지막 문항 → 결과 계산 및 저장
      setSaving(true)
      const finalType   = calcType(newVotes)
      const lessonStyle = LESSON_STYLE_MAP[finalType]

      localStorage.setItem(STYLE_TYPE_KEY, finalType)
      localStorage.setItem(STYLE_KEY, lessonStyle)

      try {
        await fetch('/api/v1/learning-style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learning_style: lessonStyle }),
        })
      } catch { /* ignore */ }

      setResult(finalType)
      setSaving(false)
    }, 350)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ─── 결과 화면 ──────────────────────────────────────────────────
  if (result) {
    const meta = TYPE_META[result]
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-sm text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${meta.color}15` }}
            >
              <Image src={meta.icon} alt={meta.label} width={52} height={52} />
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
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              학습 유형이 확인됐어요.<br />
              테스트 결과와 함께 리포트를 확인해보세요.
            </p>
            <button
              onClick={() => router.replace('/landing/report')}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
            >
              리포트 보기 <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── 설문 화면 ──────────────────────────────────────────────────
  const q        = QUESTIONS[current]
  const progress = ((current + 1) / QUESTIONS.length) * 100

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <div className="h-1 bg-[#E5E5E5]">
        <div className="h-full bg-[#00A651] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-[12px] text-[#ADADAD] mb-2">{current + 1} / {QUESTIONS.length}</div>
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
            onClick={() => router.replace('/landing/report')}
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
