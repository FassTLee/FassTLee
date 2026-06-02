'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import type { TestResult, TestQuestion } from '@/lib/landingTest'
import { SharePanel } from '@/components/common/SharePanel'

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

function ScoreEmoji(pct: number) {
  return pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📖'
}

function ScoreMsg(pct: number): { title: string; sub: string } {
  if (pct >= 80) return { title: '상위권 실력이에요!',   sub: '탄탄한 기초 위에 심화 학습을 쌓아보세요.' }
  if (pct >= 60) return { title: '평균 이상이에요!',     sub: '취약 파트를 집중 보완하면 빠르게 올라갈 수 있어요.' }
  return               { title: '기초부터 시작해봐요!', sub: '체계적인 커리큘럼으로 기초를 탄탄히 다져보세요.' }
}

function WrongItem({ q, selected }: { q: TestQuestion; selected: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border-2 border-[#E24B4A]/20 bg-[#E24B4A]/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-[15px] flex-shrink-0 mt-0.5">❌</span>
        <span className="flex-1 text-[13px] font-medium text-[#1A1A1A] leading-snug">{q.question}</span>
        {open ? <ChevronUp size={14} className="flex-shrink-0 mt-0.5 text-[#ADADAD]" /> : <ChevronDown size={14} className="flex-shrink-0 mt-0.5 text-[#ADADAD]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-[#E24B4A]/10 pt-3">
          {/* 선택한 오답 */}
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E24B4A]/15 text-[#E24B4A] flex-shrink-0 mt-0.5">내 답</span>
            <span className="text-[13px] text-[#E24B4A]">{q.options[selected]}</span>
          </div>
          {/* 정답 */}
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#639922]/15 text-[#639922] flex-shrink-0 mt-0.5">정답</span>
            <span className="text-[13px] text-[#639922] font-semibold">{q.options[q.correctIndex]}</span>
          </div>
          {/* 해설 */}
          {q.explanation && (
            <div className="bg-white rounded-xl p-3 border border-[#E5E5E5]">
              <p className="text-[11px] font-bold text-[#ADADAD] mb-1">해설</p>
              <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LandingReportPage() {
  const router = useRouter()
  const { status } = useSession()

  const [result, setResult]           = useState<TestResult | null>(null)
  const [questions, setQuestions]     = useState<TestQuestion[]>([])
  const [learningType, setLearningType] = useState<LearningType | null>(null)

  useEffect(() => {
    // localStorage 우선 (OAuth 리다이렉트 후에도 유지됨), sessionStorage fallback
    const stored =
      localStorage.getItem('landingTestResult') ??
      sessionStorage.getItem('landingTestResult') ??
      sessionStorage.getItem('testResult')
    if (stored) setResult(JSON.parse(stored))

    const qs = localStorage.getItem('landingTestQuestions')
    if (qs) setQuestions(JSON.parse(qs))

    const lt = localStorage.getItem('kinepia_learning_type') as LearningType | null
    if (lt && TYPE_META[lt]) setLearningType(lt)
  }, [])

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pct      = result.percentage ?? Math.round((result.score / result.totalQuestions) * 100)
  const msg      = ScoreMsg(pct)
  const meta     = learningType ? TYPE_META[learningType] : null
  const wrongQs  = questions.filter((_, i) => result.answers[i] !== undefined && result.answers[i] !== _.correctIndex)
  const isBlurred = status === 'unauthenticated'

  return (
    <div className="min-h-screen bg-[#F5F5F3] relative">

      {/* ─── 비로그인 로그인 유도 오버레이 ──────────────────────────── */}
      {isBlurred && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/30">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="text-[36px] mb-2">🎉</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-1.5">
                테스트 완료!
              </h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                내 학습 유형과 상세 결과를 확인하세요
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* 카카오 */}
              <button
                onClick={() => signIn('kakao', { callbackUrl: '/trainer/dashboard' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-bold text-[#1A1A1A]"
                style={{ backgroundColor: '#FEE500' }}
              >
                <svg width="18" height="18" viewBox="0 0 512 512" fill="#1A1A1A">
                  <path d="M256 32C114.6 32 0 125.1 0 240c0 72.3 45.3 136 114.3 174.6-4.9 18.1-18.2 65.4-20.9 75.7-.3.9-.6 2.1.3 2.9.9.8 2 .4 2 .4 2.6-.4 105.5-69.4 115.3-76.1C219.9 419.5 237.7 421 256 421c141.4 0 256-93.1 256-208S397.4 32 256 32z"/>
                </svg>
                카카오로 계속하기
              </button>

              {/* 구글 */}
              <button
                onClick={() => signIn('google', { callbackUrl: '/trainer/dashboard' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-[#E5E5E5] bg-white text-[14px] font-bold text-[#1A1A1A]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                구글로 계속하기
              </button>

              {/* 네이버 */}
              <button
                onClick={() => signIn('naver', { callbackUrl: '/trainer/dashboard' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-bold text-white"
                style={{ backgroundColor: '#03C75A' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
                </svg>
                네이버로 계속하기
              </button>

              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/trainer/dashboard')}
                  className="mt-3 text-[12px] text-[#ADADAD] underline"
                >
                  나중에 하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 결과 콘텐츠 (비로그인 시 blur) ────────────────────────── */}
      <div
        className="transition-all duration-500"
        style={{
          filter:        isBlurred ? 'blur(6px)' : 'none',
          pointerEvents: isBlurred ? 'none' : 'auto',
          userSelect:    isBlurred ? 'none' : 'auto',
        }}
      >

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] px-6 pt-14 pb-10">
        <div className="max-w-sm mx-auto text-center">
          <div className="text-[52px] mb-2">{ScoreEmoji(pct)}</div>
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

        {/* ─── 문항별 결과 요약 ──────────────────────────────────── */}
        {questions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
            <div className="text-[14px] font-bold text-[#1A1A1A] mb-3">📊 문항별 결과</div>
            <div className="grid grid-cols-10 gap-1.5">
              {questions.map((q, i) => {
                const correct = result.answers[i] === q.correctIndex
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-black ${
                      correct
                        ? 'bg-[#639922]/15 text-[#639922]'
                        : 'bg-[#E24B4A]/15 text-[#E24B4A]'
                    }`}
                  >
                    {correct ? '○' : '✕'}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F5F5F3]">
              <span className="text-[12px] text-[#639922] font-semibold">
                ✓ 정답 {result.score}개
              </span>
              <span className="text-[12px] text-[#E24B4A] font-semibold">
                ✗ 오답 {result.totalQuestions - result.score}개
              </span>
            </div>
          </div>
        )}

        {/* ─── 오답 노트 ────────────────────────────────────────── */}
        {wrongQs.length > 0 && (
          <div className="space-y-2">
            <div className="text-[14px] font-bold text-[#1A1A1A] px-1">📝 오답 노트 ({wrongQs.length}문제)</div>
            {questions.map((q, i) => {
              const selected = result.answers[i]
              if (selected === undefined || selected === q.correctIndex) return null
              return <WrongItem key={q.id} q={q} selected={selected} />
            })}
          </div>
        )}

        {wrongQs.length === 0 && questions.length > 0 && (
          <div className="bg-[#639922]/10 border border-[#639922]/30 rounded-2xl p-5 text-center">
            <div className="text-[32px] mb-2">🎉</div>
            <p className="text-[15px] font-black text-[#639922]">모든 문제 정답!</p>
            <p className="text-[12px] text-[#6B6B6B] mt-1">완벽한 실력이에요.</p>
          </div>
        )}

        {/* ─── 취약 파트 ────────────────────────────────────────── */}
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

        {/* ─── 학습 유형 카드 ───────────────────────────────────── */}
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
              <div className="text-[10px] font-bold mb-0.5" style={{ color: meta.color }}>
                {meta.badge}
              </div>
              <div className="text-[17px] font-black text-[#1A1A1A]">{meta.label} 학습자</div>
              <div className="text-[12px] text-[#6B6B6B] leading-relaxed mt-0.5">{meta.desc}</div>
            </div>
          </div>
        )}

        {/* ─── 공유하기 ─────────────────────────────────────────── */}
        <SharePanel score={result.score} total={result.totalQuestions} pct={pct} variant="landing" />

        {/* ─── 대시보드 CTA ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
          <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">맞춤 학습 대시보드</div>
          <p className="text-[12px] text-[#6B6B6B] mb-4 leading-relaxed">
            {status === 'authenticated'
              ? '취약 파트와 학습 유형에 맞춘 커리큘럼이 준비됐어요.'
              : '로그인 후 맞춤 대시보드를 바로 이용할 수 있어요.'}
          </p>
          <button
            onClick={() => router.push('/trainer/dashboard')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            Kinepia 시작하기 <ChevronRight size={18} />
          </button>
        </div>
      </div>

      </div> {/* end blur wrapper */}
    </div>
  )
}
