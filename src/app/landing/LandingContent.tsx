'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Check, ChevronRight } from 'lucide-react'
import { AppFooter } from '@/components/common/AppFooter'
import { SignupPromptPopup } from '@/components/common/SignupPromptPopup'

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
    comingSoon: false,
    features: [
      { text: '과목당 3챕터 무료', ok: true },
      { text: '기본 리포트 (점수 확인)', ok: true },
      { text: '미니 퀴즈', ok: true },
      { text: '챕터 테스트', ok: true },
      { text: '전체 챕터 학습', ok: false },
      { text: '상세 오답 해설', ok: false },
      { text: 'D-Day 학습 플랜', ok: false },
    ],
  },
  {
    name: '스탠다드',
    price: '₩4,900',
    sub: '/월',
    highlight: false,
    comingSoon: true,
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
    comingSoon: true,
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


export default function LandingContent() {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/trainer/dashboard')
    }
  }, [status, router])

  const [showSignupPopup, setShowSignupPopup] = useState(false)

  // 이탈 감지 핸들러를 ref에 보관 → 로그인 클릭 시 외부에서 제거 가능
  const listenersRef = useRef<{ beforeUnload: ((e: BeforeUnloadEvent) => void) | null }>({
    beforeUnload: null,
  })

  const removeExitListeners = () => {
    if (listenersRef.current.beforeUnload) {
      window.removeEventListener('beforeunload', listenersRef.current.beforeUnload)
      listenersRef.current.beforeUnload = null
    }
  }

  const handleGoogleSignIn = () => { removeExitListeners(); signIn('google', { callbackUrl: '/trainer/dashboard' }) }
  const handleKakaoSignIn  = () => { removeExitListeners(); signIn('kakao',  { callbackUrl: '/trainer/dashboard' }) }
  const handleNaverSignIn  = () => { removeExitListeners(); signIn('naver',  { callbackUrl: '/trainer/dashboard' }) }

  // 이탈 감지: guest 데이터가 있고 비로그인 상태일 때
  // popstate 차단은 Next.js App Router 내부 popstate 이벤트와 충돌하므로 제거
  useEffect(() => {
    if (status === 'loading' || status === 'authenticated') return

    const hasGuestData =
      Boolean(localStorage.getItem('kinepia_guest_id')) ||
      Boolean(localStorage.getItem('landingTestResult'))

    if (!hasGuestData) return

    // 브라우저 닫기 / 새로고침 → 네이티브 "나가시겠습니까?" 다이얼로그
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    listenersRef.current.beforeUnload = handleBeforeUnload
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => { removeExitListeners() }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white">

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-[#1A1A1A] text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#00A651]/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#378ADD]/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="relative max-w-md mx-auto px-6 pt-16 pb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#00A651]/20 border border-[#00A651]/40 rounded-full px-3 py-1.5 text-[12px] font-bold text-[#00A651] mb-6">
            국가공인 체육 자격증 학습 플랫폼
          </div>

          <h1 className="text-[32px] font-black leading-tight mb-3">
            국가공인
            <span className="text-[#00A651]"> 체육 지도 전문가</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-[11px] font-semibold text-white/60 mb-3">
            🏛️ 특허 출원 중
          </div>
          <p className="text-[16px] text-white/70 leading-relaxed mb-2">
            건강운동관리사 · 생활스포츠지도사<br />
            내 성향에 맞는 학습으로 합격까지
          </p>
          <p className="text-[12px] text-white/40 leading-relaxed mb-6">
            건강운동관리사 필기 · 2급 생활스포츠지도사 필기 · 구술/실기
          </p>

          {/* Cert list */}
          <div className="space-y-2.5 mb-8 pb-8 border-b border-white/10">
            {[
              { name: '건강운동관리사', sub: '필기 8과목', available: false },
              { name: '2급 생활스포츠지도사 (보디빌딩)', sub: '구술/실기', available: true },
              { name: '2급 생활스포츠지도사 필기', sub: '준비중', available: false },
              { name: '1급 생활스포츠지도사', sub: '필기 · 준비중', available: false },
            ].map((cert, i) => (
              <div key={i} className={`flex items-center justify-between${!cert.available ? ' opacity-45' : ''}`}>
                <div>
                  <p className="text-[13px] font-bold text-white">{cert.name}</p>
                  <p className="text-[11px] text-white/50">{cert.sub}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cert.available ? 'bg-[#00A651]/30 text-[#00A651]' : 'bg-white/10 text-white/40'}`}>
                  {cert.available ? '학습 가능' : 'coming soon'}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => { removeExitListeners(); router.push('/landing/survey') }}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold mb-4 transition-colors active:bg-[#008c44]"
          >
            내 학습 유형 알아보기 <ChevronRight size={18} />
          </button>

          {/* Login buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleGoogleSignIn}
              onMouseEnter={() => router.prefetch('/trainer/dashboard')}
              className="flex items-center justify-center gap-1.5 py-3 bg-white rounded-xl text-[12px] font-semibold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글
            </button>
            <button
              onClick={handleKakaoSignIn}
              onMouseEnter={() => router.prefetch('/trainer/dashboard')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold text-[#000]"
              style={{ backgroundColor: '#FEE500' }}
            >
              <span className="text-[14px] font-black">K</span>
              카카오
            </button>
            <button
              onClick={handleNaverSignIn}
              onMouseEnter={() => router.prefetch('/trainer/dashboard')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold text-white"
              style={{ backgroundColor: '#03C75A' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버
            </button>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section className="bg-[#F5F5F3] py-14 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#00A651] uppercase tracking-widest mb-2">왜 Kinepia인가요?</div>
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

            {/* ── Screen 1: 슬라이드 학습 ── */}
            <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-[#333]" style={{ width: '72%' }}>
              <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" className="w-full block">
                <rect width="180" height="320" fill="#1A1A1A"/>
                {/* header */}
                <rect x="0" y="0" width="180" height="52" fill="#111"/>
                <text x="14" y="30" fill="#6B6B6B" fontSize="14" fontFamily="system-ui">‹</text>
                <text x="26" y="30" fill="#6B6B6B" fontSize="8.5" fontFamily="system-ui">챕터 목록</text>
                <rect x="128" y="18" width="40" height="16" rx="8" fill="#2A2A2A" stroke="#444" strokeWidth="0.5"/>
                <text x="148" y="29" fill="#6B6B6B" fontSize="7.5" fontFamily="system-ui" textAnchor="middle">🖐️ 수동</text>
                <text x="14" y="46" fill="#ADADAD" fontSize="7" fontFamily="system-ui">운동생리학 › ATP 에너지 시스템</text>
                {/* slide counter */}
                <text x="90" y="66" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui" textAnchor="middle">5개 중 1번째</text>
                {/* slide card */}
                <rect x="10" y="72" width="160" height="182" rx="12" fill="white"/>
                <rect x="18" y="82" width="20" height="20" rx="5" fill="#00A65115"/>
                <text x="28" y="96" fill="#00A651" fontSize="10" fontFamily="system-ui" fontWeight="bold" textAnchor="middle">1</text>
                <text x="46" y="93" fill="#ADADAD" fontSize="7" fontFamily="system-ui">학습 내용</text>
                <text x="18" y="116" fill="#1A1A1A" fontSize="9" fontFamily="system-ui" fontWeight="bold">ATP 에너지 시스템의</text>
                <text x="18" y="128" fill="#1A1A1A" fontSize="9" fontFamily="system-ui" fontWeight="bold">종류와 특징</text>
                {/* checked item 1 */}
                <rect x="18" y="138" width="144" height="26" rx="6" fill="#63992212" stroke="#639922" strokeWidth="1"/>
                <rect x="24" y="146" width="12" height="12" rx="2.5" fill="#639922"/>
                <polyline points="26.5,152 29,154.5 34.5,148" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="42" y="155" fill="#639922" fontSize="7.5" fontFamily="system-ui">ATP-PC계: 즉각적 에너지 공급</text>
                {/* checked item 2 */}
                <rect x="18" y="169" width="144" height="26" rx="6" fill="#63992212" stroke="#639922" strokeWidth="1"/>
                <rect x="24" y="177" width="12" height="12" rx="2.5" fill="#639922"/>
                <polyline points="26.5,183 29,185.5 34.5,179" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="42" y="186" fill="#639922" fontSize="7.5" fontFamily="system-ui">해당계: 무산소 에너지 대사</text>
                {/* unchecked item 3 */}
                <rect x="18" y="200" width="144" height="26" rx="6" fill="#F5F5F3" stroke="#E5E5E5" strokeWidth="1"/>
                <rect x="24" y="208" width="12" height="12" rx="2.5" fill="none" stroke="#ADADAD" strokeWidth="1"/>
                <text x="42" y="217" fill="#1A1A1A" fontSize="7.5" fontFamily="system-ui">산화계: 유산소 에너지 대사</text>
                {/* progress dots */}
                <rect x="55" y="265" width="14" height="4" rx="2" fill="#00A651"/>
                <rect x="72" y="265" width="14" height="4" rx="2" fill="#333"/>
                <rect x="89" y="265" width="14" height="4" rx="2" fill="#333"/>
                <rect x="106" y="265" width="14" height="4" rx="2" fill="#333"/>
                <rect x="123" y="265" width="14" height="4" rx="2" fill="#333"/>
                {/* bottom button disabled */}
                <rect x="10" y="280" width="160" height="32" rx="10" fill="#2A2A2A"/>
                <text x="90" y="300" fill="#555" fontSize="11" fontFamily="system-ui" fontWeight="bold" textAnchor="middle">확인 퀴즈</text>
              </svg>
              <div className="bg-[#111] px-3 py-2 border-t border-[#333]">
                <p className="text-[12px] font-bold text-white">슬라이드 학습</p>
                <p className="text-[10px] text-[#6B6B6B]">체크하며 개념 확인</p>
              </div>
            </div>

            {/* ── Screen 2: 미니퀴즈 ── */}
            <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-[#333]" style={{ width: '72%' }}>
              <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" className="w-full block">
                <rect width="180" height="320" fill="#1A1A1A"/>
                {/* dimmed bg */}
                <rect width="180" height="320" fill="black" opacity="0.55"/>
                {/* bottom sheet */}
                <rect x="0" y="82" width="180" height="238" rx="18" fill="white"/>
                <rect x="75" y="92" width="30" height="4" rx="2" fill="#E5E5E5"/>
                <text x="14" y="118" fill="#1A1A1A" fontSize="12" fontFamily="system-ui" fontWeight="bold">확인 퀴즈 💡</text>
                {/* question */}
                <text x="14" y="136" fill="#1A1A1A" fontSize="8.5" fontFamily="system-ui" fontWeight="600">다음 중 운동 중 가장 먼저</text>
                <text x="14" y="148" fill="#1A1A1A" fontSize="8.5" fontFamily="system-ui" fontWeight="600">사용되는 에너지 시스템은?</text>
                {/* option A selected */}
                <rect x="14" y="158" width="152" height="34" rx="8" fill="#00A65108" stroke="#00A651" strokeWidth="1.5"/>
                <text x="22" y="179" fill="#00A651" fontSize="9" fontFamily="system-ui" fontWeight="bold">A.</text>
                <text x="34" y="174" fill="#1A1A1A" fontSize="8" fontFamily="system-ui">ATP-PC 시스템</text>
                <text x="34" y="185" fill="#6B6B6B" fontSize="7" fontFamily="system-ui">(인원질 시스템)</text>
                {/* option B */}
                <rect x="14" y="198" width="152" height="34" rx="8" fill="#F5F5F3" stroke="#E5E5E5" strokeWidth="1"/>
                <text x="22" y="219" fill="#ADADAD" fontSize="9" fontFamily="system-ui" fontWeight="bold">B.</text>
                <text x="34" y="214" fill="#1A1A1A" fontSize="8" fontFamily="system-ui">산화적 인산화</text>
                <text x="34" y="225" fill="#6B6B6B" fontSize="7" fontFamily="system-ui">(유산소 시스템)</text>
                {/* confirm button */}
                <rect x="14" y="242" width="152" height="34" rx="10" fill="#00A651"/>
                <text x="90" y="263" fill="white" fontSize="12" fontFamily="system-ui" fontWeight="bold" textAnchor="middle">확인</text>
                {/* score indicator */}
                <text x="90" y="300" fill="#ADADAD" fontSize="8" fontFamily="system-ui" textAnchor="middle">2 / 3 정답</text>
              </svg>
              <div className="bg-[#111] px-3 py-2 border-t border-[#333]">
                <p className="text-[12px] font-bold text-white">확인 퀴즈</p>
                <p className="text-[10px] text-[#6B6B6B]">슬라이드마다 즉시 점검</p>
              </div>
            </div>

            {/* ── Screen 3: 테스트 결과 ── */}
            <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-[#333]" style={{ width: '72%' }}>
              <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" className="w-full block">
                <rect width="180" height="320" fill="#1A1A1A"/>
                <rect x="0" y="0" width="180" height="48" fill="#111"/>
                <text x="90" y="28" fill="white" fontSize="11" fontFamily="system-ui" fontWeight="bold" textAnchor="middle">테스트 결과</text>
                <text x="90" y="42" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui" textAnchor="middle">ATP 에너지 시스템</text>
                {/* score circle */}
                <circle cx="90" cy="96" r="34" fill="none" stroke="#2A2A2A" strokeWidth="5"/>
                <circle cx="90" cy="96" r="34" fill="none" stroke="#00A651" strokeWidth="5"
                  strokeDasharray="152 214" strokeLinecap="round"
                  transform="rotate(-90 90 96)"/>
                <text x="90" y="92" fill="white" fontSize="18" fontFamily="system-ui" fontWeight="black" textAnchor="middle">78</text>
                <text x="90" y="105" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui" textAnchor="middle">점</text>
                {/* stats row */}
                <rect x="14" y="142" width="70" height="38" rx="8" fill="#00A65115"/>
                <text x="49" y="159" fill="#00A651" fontSize="15" fontFamily="system-ui" fontWeight="black" textAnchor="middle">14</text>
                <text x="49" y="172" fill="#6B6B6B" fontSize="7.5" fontFamily="system-ui" textAnchor="middle">정답</text>
                <rect x="96" y="142" width="70" height="38" rx="8" fill="#E24B4A15"/>
                <text x="131" y="159" fill="#E24B4A" fontSize="15" fontFamily="system-ui" fontWeight="black" textAnchor="middle">6</text>
                <text x="131" y="172" fill="#6B6B6B" fontSize="7.5" fontFamily="system-ui" textAnchor="middle">오답</text>
                {/* wrong answers section */}
                <text x="14" y="198" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui" fontWeight="bold">오답 문제</text>
                <rect x="14" y="204" width="152" height="26" rx="6" fill="#2A2A2A"/>
                <rect x="20" y="211" width="8" height="8" rx="2" fill="#E24B4A" opacity="0.8"/>
                <text x="34" y="218" fill="white" fontSize="7.5" fontFamily="system-ui">산화적 인산화의 ATP 생성량은?</text>
                <rect x="14" y="234" width="152" height="26" rx="6" fill="#2A2A2A"/>
                <rect x="20" y="241" width="8" height="8" rx="2" fill="#E24B4A" opacity="0.8"/>
                <text x="34" y="248" fill="white" fontSize="7.5" fontFamily="system-ui">VO₂max에 영향을 주는 요인은?</text>
                {/* button */}
                <rect x="14" y="274" width="152" height="34" rx="10" fill="#00A651"/>
                <text x="90" y="295" fill="white" fontSize="11" fontFamily="system-ui" fontWeight="bold" textAnchor="middle">오답 복습하기</text>
              </svg>
              <div className="bg-[#111] px-3 py-2 border-t border-[#333]">
                <p className="text-[12px] font-bold text-white">테스트 결과</p>
                <p className="text-[10px] text-[#6B6B6B]">점수 + 오답 상세 분석</p>
              </div>
            </div>

            {/* ── Screen 4: 모의고사 ── */}
            <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-[#333]" style={{ width: '72%' }}>
              <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" className="w-full block">
                <rect width="180" height="320" fill="#1A1A1A"/>
                <rect x="0" y="0" width="180" height="48" fill="#111"/>
                <text x="14" y="28" fill="white" fontSize="11" fontFamily="system-ui" fontWeight="bold">모의고사</text>
                <rect x="110" y="16" width="56" height="18" rx="9" fill="#F5A62320"/>
                <text x="138" y="28" fill="#F5A623" fontSize="8" fontFamily="system-ui" fontWeight="bold" textAnchor="middle">건강운동관리사</text>
                <text x="14" y="42" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui">운동생리학 · 20문항</text>
                {/* timer */}
                <rect x="10" y="56" width="160" height="52" rx="10" fill="#F5A62310" stroke="#F5A62330" strokeWidth="1"/>
                <text x="34" y="74" fill="#F5A623" fontSize="8" fontFamily="system-ui" fontWeight="bold">⏱ 남은 시간</text>
                <text x="90" y="98" fill="#F5A623" fontSize="28" fontFamily="system-ui" fontWeight="black" textAnchor="middle">24:35</text>
                {/* progress */}
                <text x="14" y="122" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui">12 / 20 문항</text>
                <rect x="14" y="126" width="152" height="4" rx="2" fill="#2A2A2A"/>
                <rect x="14" y="126" width="91" height="4" rx="2" fill="#00A651"/>
                {/* question */}
                <rect x="10" y="138" width="160" height="60" rx="10" fill="#222"/>
                <text x="18" y="154" fill="#ADADAD" fontSize="7.5" fontFamily="system-ui">12번</text>
                <text x="18" y="167" fill="white" fontSize="8" fontFamily="system-ui" fontWeight="600">최대산소섭취량(VO₂max)에</text>
                <text x="18" y="179" fill="white" fontSize="8" fontFamily="system-ui" fontWeight="600">영향을 미치는 요인으로 옳은 것은?</text>
                <text x="18" y="191" fill="#ADADAD" fontSize="7" fontFamily="system-ui">① 성별  ② 연령  ③ 훈련수준  ④ 모두</text>
                {/* options */}
                {[['① 성별만 해당된다', false], ['② 연령에 무관하다', false], ['③ 훈련으로 향상 가능', true], ['④ 유전적으로만 결정', false]].map(([txt, sel], oi) => (
                  <g key={oi}>
                    <rect x="10" y={206 + oi * 22} width="160" height="18" rx="5"
                      fill={sel ? '#00A65120' : '#222'}
                      stroke={sel ? '#00A651' : '#333'} strokeWidth={sel ? 1 : 0.5}/>
                    <text x="18" y={219 + oi * 22} fill={sel ? '#00A651' : '#AAA'} fontSize="7.5" fontFamily="system-ui">{txt as string}</text>
                  </g>
                ))}
                {/* nav */}
                <rect x="10" y="298" width="72" height="16" rx="6" fill="#2A2A2A"/>
                <text x="46" y="309" fill="#6B6B6B" fontSize="8" fontFamily="system-ui" textAnchor="middle">‹ 이전</text>
                <rect x="98" y="298" width="72" height="16" rx="6" fill="#00A651"/>
                <text x="134" y="309" fill="white" fontSize="8" fontFamily="system-ui" textAnchor="middle">다음 ›</text>
              </svg>
              <div className="bg-[#111] px-3 py-2 border-t border-[#333]">
                <p className="text-[12px] font-bold text-white">모의고사</p>
                <p className="text-[10px] text-[#6B6B6B]">실전 대비 타이머 시험</p>
              </div>
            </div>

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
                className={`relative rounded-2xl border-2 p-5 transition-all ${
                  plan.comingSoon
                    ? 'opacity-50 blur-[1px] select-none pointer-events-none'
                    : plan.highlight
                    ? 'bg-[#1A1A1A] border-[#00A651]'
                    : 'bg-white border-[#E5E5E5]'
                } ${!plan.comingSoon && plan.highlight ? 'bg-[#1A1A1A]' : !plan.comingSoon ? 'bg-white' : ''}`}
              >
                {/* Coming Soon 오버레이 뱃지 */}
                {plan.comingSoon && (
                  <div className="absolute top-3 right-3 z-10 bg-[#1A1A1A] text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest">
                    COMING SOON
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[15px] font-black ${plan.highlight ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {plan.name}
                      </span>
                      {plan.badge && !plan.comingSoon && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00A651] text-white">
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
                  {plan.highlight && !plan.comingSoon && (
                    <div className="bg-[#00A651]/20 rounded-xl px-3 py-1.5">
                      <p className="text-[10px] text-[#00A651] font-bold">1주일 무료</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        f.ok
                          ? plan.highlight ? 'bg-[#00A651]/20' : 'bg-[#63992215]'
                          : 'bg-[#F5F5F3]'
                      }`}>
                        {f.ok
                          ? <Check size={10} className={plan.highlight ? 'text-[#00A651]' : 'text-[#639922]'} />
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
                {plan.name === 'Free' && (
                  <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                    <p className="text-[10px] text-[#ADADAD] mb-1.5">🎁 무료 코드 입력 시 이용 가능</p>
                    {['전체 챕터 학습', '상세 오답 해설', 'D-Day 학습 플랜'].map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B] mb-1">
                        <span className="text-[#00A651]">✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─────────────────────────────────────── */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-[22px] font-black text-[#1A1A1A] mb-6">이용 후기</h2>

          {/* 실제 후기 데이터 추가 시 아래 주석 해제 */}
          {/*
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
          */}

          {/* 빈 상태 UI */}
          <div className="bg-[#F5F5F3] rounded-2xl py-10 px-6 text-center">
            <p className="text-[28px] mb-3">🙌</p>
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">베타 테스터 후기를 준비 중입니다</p>
            <p className="text-[12px] text-[#ADADAD]">첫 번째 합격자의 후기를 기다리고 있어요!</p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="bg-[#00A651] py-14 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-[40px] mb-3">🏆</div>
          <h2 className="text-[26px] font-black text-white mb-3">
            지금 바로 시작하세요
          </h2>
          <p className="text-[14px] text-white/80 mb-8 leading-relaxed">
            무료로 시작하고, 필요할 때 구독하세요.<br />
            건강운동관리사 합격, Kinepia와 함께라면 가능합니다.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleGoogleSignIn}
              onMouseEnter={() => router.prefetch('/trainer/dashboard')}
              className="flex items-center justify-center gap-1.5 py-3 bg-white/20 border border-white/30 rounded-xl text-[12px] font-semibold text-white"
            >
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글
            </button>
            <button
              onClick={handleKakaoSignIn}
              onMouseEnter={() => router.prefetch('/trainer/dashboard')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold text-[#000]"
              style={{ backgroundColor: '#FEE500' }}
            >
              <span className="font-black text-[13px]">K</span> 카카오
            </button>
            <button
              onClick={handleNaverSignIn}
              onMouseEnter={() => router.prefetch('/trainer/dashboard')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold text-white"
              style={{ backgroundColor: '#03C75A' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A]">
        <AppFooter dark />
      </div>

      {/* 이탈 시 가입 유도 팝업 */}
      {showSignupPopup && (
        <SignupPromptPopup
          callbackUrl="/landing/survey"
          onClose={() => setShowSignupPopup(false)}
        />
      )}
    </div>
  )
}
