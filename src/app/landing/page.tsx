'use client'

import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ChevronRight, Zap, BookOpen, Star } from 'lucide-react'
import { AppFooter } from '@/components/common/AppFooter'

const ACTIVE_FEATURES = [
  {
    icon: '🦴',
    title: 'Basic 해부학',
    desc: '근육·뼈대·관절의 기초를 탄탄히',
    color: '#378ADD',
  },
  {
    icon: '💪',
    title: '기능 해부학',
    desc: '기시·정지·작용 마스터',
    color: '#639922',
  },
  {
    icon: '🔄',
    title: '교차증후군',
    desc: 'Crossed Syndrome 원리와 교정',
    color: '#F5A623',
  },
]

const COMING_SOON_FEATURES = [
  { icon: '🤲', title: '컨디셔닝 마사지', desc: '증상별 마사지 테크닉 실습' },
  { icon: '🧘', title: '컨디셔닝 스트레칭', desc: '패시브/액티브 스트레칭 적용' },
  { icon: '🏅', title: '스포츠지도사 (생활/전문)', desc: '자격증 시험 대비' },
  { icon: '🩺', title: '건강운동관리사', desc: '국가자격증 대비 과정' },
  { icon: '🔬', title: '생리학', desc: '운동생리학 기초 원리' },
  { icon: '🥗', title: '영양학', desc: '트레이너를 위한 영양 기초' },
]

const LEARNING_PATH = [
  {
    step: 1,
    title: 'Basic',
    subtitle: '기초 — 핵심 개념 이해',
    desc: 'Basic 해부학 · 기능 해부학 · 교차증후군',
    color: '#378ADD',
    locked: false,
  },
  {
    step: 2,
    title: 'Intermediate',
    subtitle: '중급 — 응용 및 심화',
    desc: '기능 해부학 심화 · 교차증후군 적용',
    color: '#639922',
    locked: false,
  },
  {
    step: 3,
    title: 'Advanced',
    subtitle: '고급 — 전문가 수준 적용',
    desc: '컨디셔닝 마사지 · 스트레칭 실습',
    color: '#E24B4A',
    locked: true,
  },
  {
    step: 4,
    title: 'Mastery',
    subtitle: '숙달 — 기초~고급 전 범위',
    desc: '문제 은행식 반복 학습',
    color: '#9B59B6',
    locked: true,
  },
]

const GAMIFICATION_PREVIEW = [
  { icon: '🔥', label: '스트릭 시스템', desc: '매일 학습으로 연속 기록을 쌓으세요' },
  { icon: '⭐', label: 'XP & 레벨업', desc: '학습할수록 레벨이 올라갑니다' },
  { icon: '🏆', label: '리더보드', desc: '전국 트레이너와 경쟁하세요' },
  { icon: '🎖️', label: '배지 컬렉션', desc: '목표 달성 시 특별 배지 획득' },
]

const STATS = [
  { value: '5개', label: '학습 카테고리' },
  { value: '5~10분', label: '데일리 스냅' },
  { value: '무료', label: '체험 테스트' },
]

const TESTIMONIALS = [
  { name: '김지훈 트레이너', rating: 5, text: '해부학을 이렇게 체계적으로 배운 건 처음이에요. 레벨업이 되는 느낌이 중독적!', level: 12 },
  { name: '이수진 트레이너', rating: 5, text: '데일리 스냅이 짧아서 바쁜 날도 꼭 하게 돼요. 30일 스트릭 달성했습니다 🔥', level: 11 },
]

export default function LandingPage() {
  const router = useRouter()

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/onboarding' })
  }

  const handleKakaoSignIn = () => {
    signIn('kakao', { callbackUrl: '/onboarding' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative bg-[#1A1A1A] text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E24B4A]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#378ADD]/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-md mx-auto px-6 pt-16 pb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-[12px] font-medium mb-5">
            <Zap size={12} className="text-[#FFE066]" />
            베타 서비스 오픈
          </div>
          <h1 className="text-[36px] font-black leading-tight mb-4">
            트레이너를 위한<br />
            <span className="text-[#E24B4A]">전문 지식 플랫폼</span>
          </h1>
          <p className="text-[16px] text-white/70 leading-relaxed mb-8">
            기초 해부학부터 컨디셔닝 실습까지,<br />
            게이미피케이션으로 즐겁게 배우는<br />
            <strong className="text-white">Kinepia Education</strong>
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-[18px] font-black text-white">{s.value}</div>
                <div className="text-[10px] text-white/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/landing/test')}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] hover:bg-[#CC3E3D] rounded-2xl text-[16px] font-bold text-white transition-colors shadow-lg shadow-[#E24B4A]/30"
            >
              무료 체험 시작하기 <ChevronRight size={18} />
            </button>

            {/* 로그인 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl text-[13px] font-semibold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                구글로 시작하기
              </button>
              <button
                onClick={handleKakaoSignIn}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-[#000000] transition-colors"
                style={{ backgroundColor: '#FEE500' }}
              >
                <span className="text-[15px] font-black">K</span>
                카카오로 시작하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Learning Path ─────────────────────────────────────── */}
      <section className="bg-[#F5F5F3] py-12 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#E24B4A] uppercase tracking-widest mb-2">커리큘럼</div>
            <h2 className="text-[24px] font-black text-[#1A1A1A]">4단계 학습 경로</h2>
            <p className="text-[14px] text-[#6B6B6B] mt-2">기초부터 숙달까지, 체계적인 잠금 해제 시스템</p>
          </div>
          <div className="space-y-3">
            {LEARNING_PATH.map((lp) => (
              <div key={lp.step} className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-sm">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[18px] font-black text-white flex-shrink-0"
                  style={{ backgroundColor: lp.color }}
                >
                  {lp.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: lp.color }}
                    >
                      Step {lp.step}
                    </span>
                    {lp.locked && (
                      <span className="text-[10px] text-[#ADADAD] border border-dashed border-[#CCCCCC] px-2 py-0.5 rounded-full">
                        🔒 잠금 해제 필요
                      </span>
                    )}
                  </div>
                  <div className="text-[15px] font-bold text-[#1A1A1A]">{lp.title}</div>
                  <div className="text-[11px] text-[#ADADAD] mb-0.5">{lp.subtitle}</div>
                  <div className="text-[12px] text-[#6B6B6B]">{lp.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="mt-6">
            <div className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-3">학습 카테고리</div>

            {/* 활성 카테고리 */}
            <div className="space-y-2 mb-3">
              {ACTIVE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#E5E5E5]">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] flex-shrink-0"
                    style={{ backgroundColor: f.color + '15' }}
                  >
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-[#1A1A1A]">{f.title}</div>
                    <div className="text-[11px] text-[#6B6B6B]">{f.desc}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#12B76A15', color: '#12B76A' }}
                  >
                    오픈
                  </span>
                </div>
              ))}
            </div>

            {/* Coming Soon 카테고리 */}
            <div className="space-y-2">
              {COMING_SOON_FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#E5E5E5] opacity-40"
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] flex-shrink-0 bg-[#F5F5F3]">
                    🔒
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-[#1A1A1A]">{f.title}</div>
                    <div className="text-[11px] text-[#6B6B6B]">{f.desc}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F3] text-[#ADADAD]">
                    베타 이후 추가 예정
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Gamification ──────────────────────────────────────── */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#639922] uppercase tracking-widest mb-2">게이미피케이션</div>
            <h2 className="text-[24px] font-black text-[#1A1A1A]">공부가 게임처럼 재밌다</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {GAMIFICATION_PREVIEW.map((g, i) => (
              <div key={i} className="bg-[#F5F5F3] rounded-2xl p-4 border border-[#E5E5E5]">
                <div className="text-[26px] mb-2">{g.icon}</div>
                <div className="text-[13px] font-bold text-[#1A1A1A] mb-1">{g.label}</div>
                <div className="text-[11px] text-[#6B6B6B] leading-snug">{g.desc}</div>
              </div>
            ))}
          </div>

          {/* Level preview */}
          <div className="mt-4 bg-[#1A1A1A] rounded-2xl p-5 text-white">
            <div className="text-[12px] text-white/50 mb-2">레벨 구간</div>
            <div className="space-y-1.5">
              {[
                { range: 'Lv.1~5',   name: '📖 해부학 입문',        color: '#378ADD' },
                { range: 'Lv.6~10',  name: '🎯 기능 해부학 탐험가', color: '#639922' },
                { range: 'Lv.11~15', name: '🔍 체형 분석가',        color: '#F5A623' },
                { range: 'Lv.16~20', name: '🏆 컨디셔닝 전문가',    color: '#9B59B6' },
                { range: 'Lv.21+',   name: '👑 마스터 트레이너',    color: '#E24B4A' },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-white/40 w-16 flex-shrink-0">{l.range}</span>
                  <span className="text-[13px] font-medium" style={{ color: l.color }}>{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────── */}
      <section className="bg-[#F5F5F3] py-12 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-[22px] font-black text-[#1A1A1A]">트레이너들의 이야기</h2>
          </div>
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
                <div className="flex items-center gap-1 mb-2">
                  {Array(t.rating).fill(0).map((_, j) => (
                    <Star key={j} size={12} className="text-[#FFD700] fill-[#FFD700]" />
                  ))}
                </div>
                <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#1A1A1A]">{t.name}</div>
                    <div className="text-[10px] text-[#ADADAD]">Lv.{t.level}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────── */}
      <section className="bg-[#E24B4A] py-14 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-[32px] mb-3">🚀</div>
          <h2 className="text-[26px] font-black text-white mb-3">
            지금 무료로 실력을 확인하세요
          </h2>
          <p className="text-[14px] text-white/80 mb-3">
            5문제 테스트로 내 해부학 수준을 파악하고<br />
            맞춤형 학습 경로를 추천받으세요
          </p>
          <p className="text-[13px] text-white/70 mb-7 leading-relaxed">
            테스트를 통해 본인의 수준을 확인하고<br />
            적합한 단계부터 학습을 시작할 수 있습니다
          </p>
          <button
            onClick={() => router.push('/landing/test')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white rounded-2xl text-[16px] font-bold text-[#E24B4A] shadow-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen size={18} /> 무료 테스트 시작
          </button>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A]">
        <AppFooter dark />
      </div>
    </div>
  )
}
