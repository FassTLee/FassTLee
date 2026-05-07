'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronRight, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import type { TestResult } from '@/lib/landingTest'

type LearningType = 'conceptualizer' | 'memorizer' | 'planner' | 'intensive'

const TYPE_META: Record<LearningType, { label: string; icon: string; color: string; badge: string; desc: string }> = {
  conceptualizer: {
    label: '이해형',
    icon:  '/assets/icons/user/user-learning-conceptual.svg',
    color: '#639922',
    badge: '원리 탐구 학습자',
    desc:  '원리와 개념 중심으로 학습해요.',
  },
  memorizer: {
    label: '암기형',
    icon:  '/assets/icons/user/user-learning-memory.svg',
    color: '#378ADD',
    badge: '핵심 반복 학습자',
    desc:  '핵심 키워드 반복으로 효율적으로 암기해요.',
  },
  planner: {
    label: '계획형',
    icon:  '/assets/icons/user/user-learning-planner.svg',
    color: '#9B59B6',
    badge: '체계적 전략 학습자',
    desc:  '계획을 세워 체계적으로 학습해요.',
  },
  intensive: {
    label: '강제형',
    icon:  '/assets/icons/user/user-learning-intensive.svg',
    color: '#E24B4A',
    badge: '집중 몰입 학습자',
    desc:  '압박감과 데드라인으로 최대 집중력을 발휘해요.',
  },
}

const SCORE_EMOJI: (pct: number) => string = (pct) =>
  pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📖'

const SCORE_MSG: (pct: number) => { title: string; sub: string } = (pct) => {
  if (pct >= 80) return { title: '상위권 실력이에요!', sub: '탄탄한 기초 위에 심화 학습을 쌓아보세요.' }
  if (pct >= 60) return { title: '평균 이상이에요!',   sub: '취약 파트를 집중 보완하면 빠르게 올라갈 수 있어요.' }
  return           { title: '기초부터 시작해봐요!', sub: '체계적인 커리큘럼으로 기초를 탄탄히 다져보세요.' }
}

export default function LandingReportPage() {
  const router = useRouter()
  const { status } = useSession()

  const [result, setResult]       = useState<TestResult | null>(null)
  const [learningType, setLearningType] = useState<LearningType | null>(null)

  useEffect(() => {
    // 테스트 결과 (신규 키 우선, 구 키 fallback)
    const stored = sessionStorage.getItem('landingTestResult') ?? sessionStorage.getItem('testResult')
    if (stored) setResult(JSON.parse(stored))

    // 학습 유형
    const lt = localStorage.getItem('kinepia_learning_type') as LearningType | null
    if (lt && TYPE_META[lt]) setLearningType(lt)
  }, [])

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pct  = result.percentage ?? Math.round((result.score / result.totalQuestions) * 100)
  const msg  = SCORE_MSG(pct)
  const meta = learningType ? TYPE_META[learningType] : null

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] px-6 pt-14 pb-10">
        <div className="max-w-sm mx-auto text-center">
          <div className="text-[52px] mb-2">{SCORE_EMOJI(pct)}</div>
          <div className="text-[48px] font-black text-white leading-none mb-1">
            {result.score}
            <span className="text-white/40 text-[28px]"> / {result.totalQuestions}</span>
          </div>
          <div className="text-[22px] font-bold text-white mb-1">{pct}%</div>
          <p className="text-[20px] font-black text-white mb-1">{msg.title}</p>
          <p className="text-[13px] text-white/60 leading-relaxed">{msg.sub}</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4 pb-10">

        {/* ─── 학습 유형 ──────────────────────────────────────── */}
        {meta && (
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ backgroundColor: `${meta.color}10`, border: `1.5px solid ${meta.color}30` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${meta.color}20` }}
            >
              <Image src={meta.icon} alt={meta.label} width={36} height={36} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] font-bold mb-0.5"
                style={{ color: meta.color }}
              >
                {meta.badge}
              </div>
              <div className="text-[17px] font-black text-[#1A1A1A]">{meta.label} 학습자</div>
              <div className="text-[12px] text-[#6B6B6B] leading-relaxed mt-0.5">{meta.desc}</div>
            </div>
          </div>
        )}

        {/* ─── 취약 파트 ──────────────────────────────────────── */}
        {result.weakAreas && result.weakAreas.length > 0 && (
          <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-2xl p-5">
            <div className="text-[13px] font-bold text-[#1A1A1A] mb-2">⚠️ 취약 파트</div>
            <div className="space-y-1.5">
              {result.weakAreas.map((area, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="text-[#E24B4A]">·</span>
                  <span className="text-[#1A1A1A]">{area}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 대시보드 CTA ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
          <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">맞춤 학습 대시보드</div>
          <p className="text-[12px] text-[#6B6B6B] mb-4 leading-relaxed">
            {status === 'authenticated'
              ? '분석된 취약 파트와 학습 유형에 맞춘 커리큘럼이 준비됐어요.'
              : '로그인 후 맞춤 대시보드를 바로 이용할 수 있어요.'}
          </p>
          <button
            onClick={() => router.push('/trainer/dashboard')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-bold"
          >
            대시보드 시작하기 <ChevronRight size={18} />
          </button>
        </div>

        {/* ─── 다시 도전 ──────────────────────────────────────── */}
        <button
          onClick={() => {
            sessionStorage.removeItem('landingTestResult')
            sessionStorage.removeItem('testResult')
            router.push('/landing/test')
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-[#E5E5E5] bg-white text-[#6B6B6B] rounded-2xl text-[14px] font-semibold"
        >
          <RefreshCw size={14} /> 테스트 다시 도전
        </button>
      </div>
    </div>
  )
}
