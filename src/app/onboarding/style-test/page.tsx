'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const STYLE_KEY      = 'kinepia_learning_style'   // memorizer | conceptualizer (레슨 동작용)
const STYLE_TYPE_KEY = 'kinepia_learning_type'     // 4가지 상세 유형

type LearningType = 'conceptualizer' | 'memorizer' | 'planner' | 'intensive'

interface Question {
  q: string
  options: { text: string; type: LearningType }[]
}

const QUESTIONS: Question[] = [
  {
    q: '새로운 개념을 배울 때 나는?',
    options: [
      { text: '원리를 이해하며 깊이 파고든다', type: 'conceptualizer' },
      { text: '핵심 단어부터 반복 암기한다',   type: 'memorizer'      },
      { text: '순서대로 계획을 세워 공부한다',  type: 'planner'        },
      { text: '일단 빠르게 훑고 몰아서 집중',  type: 'intensive'      },
    ],
  },
  {
    q: '공부할 때 가장 중요하게 생각하는 것은?',
    options: [
      { text: '왜 그런지 이유를 아는 것',      type: 'conceptualizer' },
      { text: '핵심을 빠르게 외우는 것',        type: 'memorizer'      },
      { text: '정해진 분량을 지키는 것',        type: 'planner'        },
      { text: '짧게 집중해서 효율을 높이는 것', type: 'intensive'      },
    ],
  },
  {
    q: '모르는 내용이 나오면?',
    options: [
      { text: '이해될 때까지 끝까지 파고든다',  type: 'conceptualizer' },
      { text: '정답을 반복해서 외워버린다',     type: 'memorizer'      },
      { text: '복습 날짜에 맞춰 따로 표시해둔다', type: 'planner'      },
      { text: '일단 넘기고 나중에 한꺼번에',    type: 'intensive'      },
    ],
  },
  {
    q: '선호하는 학습 자료는?',
    options: [
      { text: '교재·상세 설명 위주',           type: 'conceptualizer' },
      { text: '요약본·핵심 정리 노트',          type: 'memorizer'      },
      { text: '스케줄러·계획표',               type: 'planner'        },
      { text: '기출 문제·빠른 정답 풀이',       type: 'intensive'      },
    ],
  },
  {
    q: '시험 준비는 보통?',
    options: [
      { text: '꾸준히 이해하며 오랫동안 준비',  type: 'conceptualizer' },
      { text: '핵심 포인트 반복 암기 위주',      type: 'memorizer'      },
      { text: '날짜별 분량 계획 세우기',        type: 'planner'        },
      { text: '시험 직전 집중 몰아치기',        type: 'intensive'      },
    ],
  },
  {
    q: '학습 중 집중이 잘되는 환경은?',
    options: [
      { text: '조용히 혼자 깊이 생각할 수 있을 때', type: 'conceptualizer' },
      { text: '짧은 반복 플래시카드나 퀴즈',        type: 'memorizer'      },
      { text: '체크리스트를 하나씩 지워갈 때',       type: 'planner'        },
      { text: '데드라인이나 압박감이 있을 때',        type: 'intensive'      },
    ],
  },
  {
    q: '오답이 나왔을 때 나는?',
    options: [
      { text: '왜 틀렸는지 원인을 분석한다',    type: 'conceptualizer' },
      { text: '정답을 여러 번 반복해서 외운다', type: 'memorizer'      },
      { text: '오답 노트에 정리해 계획적으로',  type: 'planner'        },
      { text: '비슷한 문제를 빠르게 많이 푼다', type: 'intensive'      },
    ],
  },
  {
    q: '하루 학습 스타일에 가장 가까운 것은?',
    options: [
      { text: '매일 조금씩 깊이 있게',           type: 'conceptualizer' },
      { text: '매일 핵심만 짧게 반복',           type: 'memorizer'      },
      { text: '주간 계획대로 규칙적으로',         type: 'planner'        },
      { text: '필요할 때 집중적으로 몰아서',      type: 'intensive'      },
    ],
  },
]

// 각 질문의 선택지 순서를 랜덤하게 섞기
function shuffleOptions(questions: Question[]): Question[] {
  return questions.map((q) => ({
    ...q,
    options: [...q.options].sort(() => Math.random() - 0.5),
  }))
}

// 점수 집계 후 최다 득표 유형 반환
function calcType(votes: LearningType[]): LearningType {
  const count: Record<LearningType, number> = { conceptualizer: 0, memorizer: 0, planner: 0, intensive: 0 }
  votes.forEach((v) => { count[v]++ })
  return (Object.keys(count) as LearningType[]).reduce((a, b) => count[a] >= count[b] ? a : b)
}

// 레슨 동작용 2-type 매핑
const LESSON_STYLE_MAP: Record<LearningType, 'memorizer' | 'conceptualizer'> = {
  conceptualizer: 'conceptualizer',
  planner:        'conceptualizer',
  memorizer:      'memorizer',
  intensive:      'memorizer',
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
    if (existing) router.replace('/select-subject')
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
      const result      = calcType(newVotes)
      const lessonStyle = LESSON_STYLE_MAP[result]

      localStorage.setItem(STYLE_TYPE_KEY, result)
      localStorage.setItem(STYLE_KEY, lessonStyle)

      // DB 저장 실패 시 sessionStorage에 pending 마킹 — 대시보드에서 재시도 가능하도록
      try {
        const res = await fetch('/api/v1/learning-style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learning_style: lessonStyle }),
        })
        const json = await res.json()
        if (!json.saved) {
          sessionStorage.setItem('kinepia_style_pending', lessonStyle)
          console.warn('[style-test] DB 저장 실패 — pending 마킹')
        }
      } catch {
        sessionStorage.setItem('kinepia_style_pending', lessonStyle)
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
              router.replace('/select-subject')
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
