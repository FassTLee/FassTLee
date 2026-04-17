'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Zap, BookOpen, Star } from 'lucide-react'
import { AppFooter } from '@/components/common/AppFooter'

const FEATURES = [
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
  {
    icon: '🤲',
    title: '컨디셔닝 마사지',
    desc: '증상별 마사지 테크닉 실습',
    color: '#E24B4A',
  },
  {
    icon: '🧘',
    title: '컨디셔닝 스트레칭',
    desc: '패시브/액티브 스트레칭 적용',
    color: '#9B59B6',
  },
]

const LEARNING_PATH = [
  {
    step: 1,
    title: '해부학',
    subtitle: 'Anatomy',
    desc: 'Basic 해부학 · 기능 해부학',
    color: '#378ADD',
    locked: false,
  },
  {
    step: 2,
    title: '교차증후군',
    subtitle: 'Crossed Syndrome',
    desc: '체형 분석 · 교정 원리',
    color: '#F5A623',
    locked: false,
  },
  {
    step: 3,
    title: '컨디셔닝 테크닉',
    subtitle: 'Conditioning Technique',
    desc: '마사지 · 스트레칭 실습',
    color: '#E24B4A',
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

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative bg-[#1A1A1A] text-white overflow-hidden">
        {/* Decorative blobs */}
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
            <button
              onClick={() => router.push('/trainer/education')}
              className="w-full py-3.5 border border-white/20 rounded-2xl text-[14px] font-medium text-white/80 hover:bg-white/5 transition-colors"
            >
              앱 미리보기
            </button>
          </div>
        </div>
      </section>

      {/* ─── Learning Path ─────────────────────────────────────── */}
      <section className="bg-[#F5F5F3] py-12 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold text-[#E24B4A] uppercase tracking-widest mb-2">커리큘럼</div>
            <h2 className="text-[24px] font-black text-[#1A1A1A]">3단계 학습 경로</h2>
            <p className="text-[14px] text-[#6B6B6B] mt-2">기초부터 실습까지, 체계적인 잠금 해제 시스템</p>
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

          {/* 5 Categories */}
          <div className="mt-6">
            <div className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-3">학습 카테고리</div>
            <div className="grid grid-cols-1 gap-2">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#E5E5E5]">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] flex-shrink-0"
                    style={{ backgroundColor: f.color + '15' }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#1A1A1A]">{f.title}</div>
                    <div className="text-[11px] text-[#6B6B6B]">{f.desc}</div>
                  </div>
                  <div
                    className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: f.color + '15', color: f.color }}
                  >
                    {i + 1}
                  </div>
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
