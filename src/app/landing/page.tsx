'use client'

import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Check, ChevronRight } from 'lucide-react'
import { AppFooter } from '@/components/common/AppFooter'

const FEATURES = [
  {
    icon: '🧠',
    title: '성향 맞춤 학습',
    desc: '암기형·이해형 진단 후 내 스타일에 맞게 최적화된 학습 콘텐츠 제공',
  },
  {
    icon: '📝',
    title: '400+ 예상 문제',
    desc: '실제 시험 출제 경향을 분석한 핵심 문제 은행으로 효율적 반복 학습',
  },
  {
    icon: '📊',
    title: '오답 분석 리포트',
    desc: '틀린 문제·취약 챕터 자동 분석으로 부족한 부분을 정확히 짚어드립니다',
  },
  {
    icon: '📅',
    title: 'D-Day 맞춤 관리',
    desc: '시험일 기준 역산 학습 플랜, 일일 진도 체크로 합격을 함께 준비해요',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '무료',
    sub: '영원히 무료',
    highlight: false,
    features: [
      { text: '과목당 3챕터 무료', ok: true },
      { text: '기본 리포트 (점수 확인)', ok: true },
      { text: '미니 퀴즈', ok: true },
      { text: '전체 챕터 학습', ok: false },
      { text: '상세 오답 해설', ok: false },
      { text: 'D-Day 학습 플랜', ok: false },
      { text: '광고 없음', ok: false },
    ],
  },
  {
    name: '스탠다드',
    price: '₩4,900',
    sub: '/월',
    highlight: true,
    badge: '인기',
    features: [
      { text: '전체 챕터 무제한 학습', ok: true },
      { text: '상세 오답 해설 리포트', ok: true },
      { text: 'D-Day 학습 플랜', ok: true },
      { text: '광고 없음', ok: true },
      { text: 'AI 맞춤 문제', ok: false },
      { text: '합격 예측 분석', ok: false },
      { text: '틀린 노트 자동 생성', ok: false },
    ],
  },
  {
    name: '프리미엄',
    price: '₩9,900',
    sub: '/월',
    highlight: false,
    features: [
      { text: '전체 챕터 무제한 학습', ok: true },
      { text: '상세 오답 해설 리포트', ok: true },
      { text: 'D-Day 학습 플랜', ok: true },
      { text: '광고 없음', ok: true },
      { text: 'AI 맞춤 문제 생성', ok: true },
      { text: '합격 예측 분석', ok: true },
      { text: '틀린 노트 자동 생성', ok: true },
    ],
  },
]

const MOCK_SCREENS = [
  { emoji: '📚', label: '챕터 학습', desc: '슬라이드 방식 학습', bg: 'from-[#E24B4A]/20 to-[#1A1A1A]' },
  { emoji: '✅', label: '확인 퀴즈', desc: 'A/B 2지선다 빠른 체크', bg: 'from-[#378ADD]/20 to-[#1A1A1A]' },
  { emoji: '📊', label: '오답 리포트', desc: '취약점 상세 분석', bg: 'from-[#639922]/20 to-[#1A1A1A]' },
]

export default function LandingPage() {
  const router = useRouter()

  const handleGoogleSignIn = () => signIn('google', { callbackUrl: '/trainer/dashboard' })
  const handleKakaoSignIn  = () => signIn('kakao',  { callbackUrl: '/trainer/dashboard' })

  return (
    <div className="min-h-screen bg-white">

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-[#1A1A1A] text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#E24B4A]/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#378ADD]/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="relative max-w-md mx-auto px-6 pt-16 pb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#E24B4A]/20 border border-[#E24B4A]/40 rounded-full px-3 py-1.5 text-[12px] font-bold text-[#E24B4A] mb-6">
            🎯 건강운동관리사 합격 특화
          </div>

          <h1 className="text-[34px] font-black leading-tight mb-3">
            건강운동관리사<br />
            <span className="text-[#E24B4A]">합격의 지름길</span>
          </h1>
          <p className="text-[16px] text-white/70 leading-relaxed mb-8">
            성향 맞춤 학습으로 더 빠르게 합격하세요.<br />
            암기형·이해형 진단부터 오답 분석까지,<br />
            <strong className="text-white">Kinepia</strong>가 함께합니다.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-white/10">
            {[
              { value: '400+', label: '예상 문제' },
              { value: '8과목', label: '전 과목 커버' },
              { value: '무료', label: '시작 가능' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-[20px] font-black text-white">{s.value}</div>
                <div className="text-[10px] text-white/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/landing/test')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] hover:bg-[#cc3e3d] rounded-2xl text-[16px] font-bold text-white mb-4 shadow-lg shadow-[#E24B4A]/30 transition-colors"
          >
            무료로 시작하기 <ChevronRight size={18} />
          </button>
          <p className="text-[11px] text-white/40 text-center mb-4">
            로그인 없이 바로 시작 가능 · 결과 저장 시 로그인
          </p>

          {/* Login buttons */}
          <div className="grid grid-cols-2 gap-2">
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
              구글 로그인
            </button>
            <button
              onClick={handleKakaoSignIn}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-[#000]"
              style={{ backgroundColor: '#FEE500' }}
            >
              <span className="text-[15px] font-black">K</span>
              카카오 로그인
            </button>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section className="bg-[#F5F5F3] py-14 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#E24B4A] uppercase tracking-widest mb-2">왜 Kinepia인가요?</div>
            <h2 className="text-[24px] font-black text-[#1A1A1A]">합격을 위한 4가지 무기</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-[#E5E5E5]">
                <div className="text-[28px] mb-2">{f.icon}</div>
                <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">{f.title}</p>
                <p className="text-[11px] text-[#6B6B6B] leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── App Screens ──────────────────────────────────────── */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#378ADD] uppercase tracking-widest mb-2">앱 미리보기</div>
            <h2 className="text-[24px] font-black text-[#1A1A1A]">이렇게 학습해요</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {MOCK_SCREENS.map((s, i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl overflow-hidden border border-[#E5E5E5]"
                style={{ width: '75%' }}
              >
                <div
                  className={`flex items-center justify-center bg-gradient-to-br ${s.bg}`}
                  style={{ aspectRatio: '9/16', maxHeight: 280 }}
                >
                  <div className="text-center">
                    <div className="text-[52px] mb-2">{s.emoji}</div>
                    <p className="text-white/80 text-[13px] font-bold">{s.label}</p>
                    <p className="text-white/50 text-[11px]">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      <section className="bg-[#F5F5F3] py-14 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#639922] uppercase tracking-widest mb-2">요금제</div>
            <h2 className="text-[24px] font-black text-[#1A1A1A]">나에게 맞는 플랜 선택</h2>
            <p className="text-[13px] text-[#6B6B6B] mt-2">무료로 시작하고 필요할 때 업그레이드하세요</p>
          </div>

          <div className="space-y-4">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl border-2 p-5 ${
                  plan.highlight
                    ? 'bg-[#1A1A1A] border-[#E24B4A]'
                    : 'bg-white border-[#E5E5E5]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[15px] font-black ${plan.highlight ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E24B4A] text-white">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-[24px] font-black ${plan.highlight ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-[12px] ${plan.highlight ? 'text-white/60' : 'text-[#ADADAD]'}`}>
                        {plan.sub}
                      </span>
                    </div>
                  </div>
                  {plan.highlight && (
                    <div className="bg-[#E24B4A]/20 rounded-xl px-3 py-1.5">
                      <p className="text-[10px] text-[#E24B4A] font-bold">1주일 무료</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        f.ok
                          ? plan.highlight ? 'bg-[#E24B4A]/20' : 'bg-[#63992215]'
                          : 'bg-[#F5F5F3]'
                      }`}>
                        {f.ok
                          ? <Check size={10} className={plan.highlight ? 'text-[#E24B4A]' : 'text-[#639922]'} />
                          : <span className="text-[8px] text-[#ADADAD]">✕</span>
                        }
                      </div>
                      <span className={`text-[12px] ${
                        f.ok
                          ? plan.highlight ? 'text-white' : 'text-[#1A1A1A]'
                          : plan.highlight ? 'text-white/30' : 'text-[#ADADAD]'
                      }`}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/select-cert')}
                  className={`w-full py-3 rounded-xl text-[13px] font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-[#E24B4A] text-white hover:bg-[#cc3e3d]'
                      : 'bg-[#F5F5F3] text-[#1A1A1A] hover:bg-[#E5E5E5]'
                  }`}
                >
                  {plan.highlight ? '1주일 무료 체험' : '시작하기'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─────────────────────────────────────── */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-[22px] font-black text-[#1A1A1A] mb-6">합격자들의 한마디</h2>
          <div className="space-y-3">
            {[
              { name: '김민준', text: '성향 진단이 정말 정확해요. 이해형으로 나왔는데 딱 맞는 설명 방식이 이해가 잘 됩니다.', score: '필기 89점' },
              { name: '박서연', text: '오답 리포트 덕분에 취약 챕터를 집중 공략할 수 있었어요. 3개월 만에 합격했습니다!', score: '1회 합격' },
            ].map((t, i) => (
              <div key={i} className="bg-[#F5F5F3] rounded-2xl p-4 text-left">
                <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                      {t.name[0]}
                    </div>
                    <span className="text-[12px] font-semibold text-[#1A1A1A]">{t.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#639922] bg-[#63992215] px-2 py-0.5 rounded-full">
                    {t.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="bg-[#E24B4A] py-14 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-[40px] mb-3">🏆</div>
          <h2 className="text-[26px] font-black text-white mb-3">
            지금 바로 시작하세요
          </h2>
          <p className="text-[14px] text-white/80 mb-8 leading-relaxed">
            무료로 시작하고, 필요할 때 구독하세요.<br />
            건강운동관리사 합격, Kinepia와 함께라면 가능합니다.
          </p>
          <button
            onClick={() => router.push('/select-cert')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white rounded-2xl text-[16px] font-bold text-[#E24B4A] shadow-lg mb-3"
          >
            무료로 시작하기 <ChevronRight size={18} />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-2 py-3 bg-white/20 border border-white/30 rounded-xl text-[13px] font-semibold text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글 로그인
            </button>
            <button
              onClick={handleKakaoSignIn}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-[#000]"
              style={{ backgroundColor: '#FEE500' }}
            >
              <span className="font-black">K</span> 카카오 로그인
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A]">
        <AppFooter dark />
      </div>
    </div>
  )
}
