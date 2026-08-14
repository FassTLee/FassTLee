'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { isLearningType, type LearningType } from '@/lib/learning-types'
import { shuffle } from '@/lib/shuffle'

const STYLE_TYPE_KEY = 'kinepia_learning_type'

interface Question {
  q: string
  options: { text: string; type: LearningType }[]
}

const QUESTIONS: Question[] = [
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
    q: '공부할 때 가장 중요하게 생각하는 것은?',
    options: [
      { text: '왜 그런지 이유를 아는 것',        type: 'explorer' },
      { text: '여러 번 봐서 몸에 익히는 것',     type: 'repeater' },
      { text: '정한 분량을 지켜내는 것',          type: 'planner'  },
      { text: '핵심이 뭔지 빠르게 알아채는 것',   type: 'spotter'  },
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
  {
    q: '학습 중 집중이 잘되는 환경은?',
    options: [
      { text: '혼자 조용히 깊이 생각할 수 있을 때',       type: 'explorer' },
      { text: '짧은 반복 퀴즈나 플래시카드가 있을 때',    type: 'repeater' },
      { text: '체크리스트를 하나씩 지워갈 때',            type: 'planner'  },
      { text: '설명 없이도 흐름이 보일 때',                type: 'spotter'  },
    ],
  },
  {
    q: '오답이 나왔을 때 나는?',
    options: [
      { text: '왜 틀렸는지 원인을 분석한다',                 type: 'explorer' },
      { text: '정답을 여러 번 되새겨 외운다',                type: 'repeater' },
      { text: '오답 노트에 정리해 다시 볼 날을 잡는다',      type: 'planner'  },
      { text: '어디서 감이 어긋났는지 되짚는다',             type: 'spotter'  },
    ],
  },
  {
    q: '하루 학습 스타일에 가장 가까운 것은?',
    options: [
      { text: '매일 조금씩 깊이 있게',          type: 'explorer' },
      { text: '매일 핵심만 짧게 되풀이',        type: 'repeater' },
      { text: '주간 계획대로 규칙적으로',        type: 'planner'  },
      { text: '매일 전체를 빠르게 훑으며',       type: 'spotter'  },
    ],
  },
]

// 각 질문의 선택지 순서를 랜덤하게 섞기
function shuffleOptions(questions: Question[]): Question[] {
  return questions.map((q) => ({
    ...q,
    options: shuffle(q.options),
  }))
}

// 점수 집계 후 최다 득표 유형 반환
function calcType(votes: LearningType[]): LearningType {
  const count: Record<LearningType, number> = { spotter: 0, planner: 0, repeater: 0, explorer: 0 }
  votes.forEach((v) => { count[v]++ })
  return (Object.keys(count) as LearningType[]).reduce((a, b) => count[a] >= count[b] ? a : b)
}

export default function StyleTestPage() {
  const { status } = useSession()
  const router = useRouter()

  const [questions] = useState<Question[]>(() => shuffleOptions(QUESTIONS))
  const [current, setCurrent] = useState(0)
  const [votes, setVotes] = useState<LearningType[]>([])
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<LearningType | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    const existing = localStorage.getItem(STYLE_TYPE_KEY)
    if (isLearningType(existing)) router.replace('/select-subject')
  }, [status, router])

  const handleSelect = async (type: LearningType) => {
    if (saving || selected) return
    setSelected(type)

    setTimeout(async () => {
      const newVotes = [...votes, type]

      if (current < questions.length - 1) {
        setVotes(newVotes)
        setCurrent(current + 1)
        setSelected(null)
        return
      }

      // 마지막 문항 → 결과 계산
      setSaving(true)
      const result = calcType(newVotes)

      localStorage.setItem(STYLE_TYPE_KEY, result)

      // DB 저장 실패 시 sessionStorage에 pending 마킹 — 대시보드에서 재시도 가능하도록
      try {
        const res = await fetch('/api/v1/learning-style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            learning_style: result,
            learning_style_answers: newVotes,
          }),
        })
        const json = await res.json()
        if (!json.saved) {
          sessionStorage.setItem('kinepia_style_pending', result)
          console.warn('[style-test] DB 저장 실패 — pending 마킹')
        }
      } catch {
        sessionStorage.setItem('kinepia_style_pending', result)
        console.warn('[style-test] API 호출 실패 — pending 마킹')
      }

      // 테스트 완료 → 팝업 dismiss 플래그 제거 (팝업 필요 없음, 결과 페이지로 이동)
      sessionStorage.removeItem('kinepia_style_dismissed')

      router.replace('/onboarding/style-result')
    }, 350)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const progress = ((current + 1) / questions.length) * 100
  const q        = questions[current]

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 프로그레스 바 */}
      <div className="h-1 bg-[#E5E5E5]">
        <div
          className="h-full bg-[#E24B4A] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <div className="text-[12px] text-[#ADADAD] mb-2">{current + 1} / {questions.length}</div>
            <p className="text-[10px] font-semibold text-[#E24B4A] tracking-widest uppercase mb-2">
              학습 성향 테스트
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
                    ? 'bg-[#E24B4A]/10 border-[#E24B4A] text-[#E24B4A]'
                    : selected !== null
                    ? 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-50'
                    : 'bg-white border-[#E5E5E5] text-[#1A1A1A] active:bg-[#E24B4A]/5 active:border-[#E24B4A]'
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
              <div className="w-4 h-4 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
              유형 분석 중...
            </div>
          )}

          <button
            onClick={() => {
              sessionStorage.setItem('kinepia_style_dismissed', '1')
              router.replace('/trainer/dashboard')
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
