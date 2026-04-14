'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, RefreshCw, Download, Apple } from 'lucide-react'
import { getResultMessage, type TestResult } from '@/lib/landingTest'
import { LANDING_QUESTIONS } from '@/lib/landingTest'
import { AppFooter } from '@/components/common/AppFooter'

interface StoredResult extends TestResult {
  user?: { name: string; email: string; avatar: string }
}

function PairingCodeModal({ onClose }: { onClose: () => void }) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
        <div className="text-[32px] mb-3">🔗</div>
        <h3 className="text-[18px] font-black text-[#1A1A1A] mb-2">앱 연동 코드</h3>
        <p className="text-[13px] text-[#6B6B6B] mb-5">앱 가입 시 아래 코드를 입력하면<br />웹 학습 기록이 자동 연동됩니다</p>
        <div className="bg-[#F5F5F3] rounded-2xl py-5 px-6 mb-5">
          <div className="text-[32px] font-black text-[#1A1A1A] tracking-[0.2em]">{code}</div>
          <div className="text-[11px] text-[#ADADAD] mt-1">24시간 유효</div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-[14px] font-semibold"
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default function LandingReportPage() {
  const router = useRouter()
  const [result, setResult] = useState<StoredResult | null>(null)
  const [showPairing, setShowPairing] = useState(false)
  const [_appDownloadClicked, setAppDownloadClicked] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('testResult')
    if (stored) {
      setResult(JSON.parse(stored))
    } else {
      // Demo result
      setResult({
        score: 3,
        totalQuestions: 5,
        answers: [1, 1, 1, 0, 2],
        weakAreas: ['기초 해부학 — 교차증후군', '컨디셔닝 스트레칭'],
        percentage: 60,
        user: { name: '박트레이너', email: 'trainer@fitdoor.com', avatar: 'P' },
      })
    }
  }, [])

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="text-[#ADADAD]">결과를 불러오는 중...</div>
      </div>
    )
  }

  const msgConfig = getResultMessage(result.percentage)

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {showPairing && <PairingCodeModal onClose={() => setShowPairing(false)} />}

      {/* ─── Hero result ───────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] px-6 pt-12 pb-10">
        <div className="max-w-sm mx-auto text-center">
          {result.user && (
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-8 h-8 bg-[#E24B4A] rounded-full flex items-center justify-center text-white text-[13px] font-bold">
                {result.user.avatar}
              </div>
              <span className="text-[13px] text-white/70">{result.user.name}</span>
            </div>
          )}
          <div className="text-[52px] mb-3">{msgConfig.emoji}</div>
          <div className="text-[44px] font-black text-white mb-1">
            {result.score}<span className="text-white/40 text-[28px]">/{result.totalQuestions}</span>
          </div>
          <div className="text-[15px] font-bold mb-1" style={{ color: msgConfig.color }}>
            {result.percentage}점
          </div>
          <div className="text-[20px] font-black text-white mb-2">{msgConfig.title}</div>
          <p className="text-[13px] text-white/60 leading-relaxed">{msgConfig.subtitle}</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

        {/* ─── Score breakdown ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
          <div className="text-[14px] font-bold text-[#1A1A1A] mb-4">📊 문항별 결과</div>
          <div className="space-y-2.5">
            {LANDING_QUESTIONS.map((q, i) => {
              const correct = result.answers[i] === q.correctIndex
              return (
                <div key={q.id} className={`flex items-start gap-3 px-3 py-3 rounded-xl border ${
                  correct ? 'bg-[#639922]/5 border-[#639922]/20' : 'bg-[#E24B4A]/5 border-[#E24B4A]/20'
                }`}>
                  <span className="text-[16px] flex-shrink-0">{correct ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[#1A1A1A] leading-snug truncate">{q.question}</div>
                    {!correct && (
                      <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                        정답: <span className="text-[#639922] font-medium">{q.options[q.correctIndex]}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Weak area analysis ──────────────────────────────── */}
        {result.weakAreas.length > 0 && (
          <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-2xl p-5">
            <div className="text-[14px] font-bold text-[#1A1A1A] mb-3">⚠️ 취약 파트 분석</div>
            <div className="space-y-2">
              {result.weakAreas.map((area, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="text-[#E24B4A]">·</span>
                  <span className="text-[#1A1A1A]">{area}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12px] text-[#6B6B6B] bg-white rounded-xl p-3 border border-[#FFE066]/50">
              💡 FassT Education에서 이 부분을 집중 학습하면 빠르게 보완할 수 있습니다!
            </div>
          </div>
        )}

        {/* ─── Recommended learning path ───────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
          <div className="text-[14px] font-bold text-[#1A1A1A] mb-4">🗺️ 추천 학습 경로</div>
          <div className="space-y-2">
            {[
              { step: 1, title: '기초 해부학', desc: '신체 구조 기본 개념', color: '#378ADD', locked: false },
              { step: 2, title: '기능 해부학 초급', desc: '기시·정지·움직임', color: '#639922', locked: false },
              { step: 3, title: '기능 해부학 중급', desc: '작용·주의사항', color: '#639922', locked: false },
              { step: 4, title: '컨디셔닝 적용', desc: '마사지·스트레칭 연계', color: '#9B59B6', locked: true },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                item.locked ? 'opacity-50' : ''
              }`}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[#1A1A1A]">{item.title}</div>
                  <div className="text-[11px] text-[#ADADAD]">{item.desc}</div>
                </div>
                {item.locked && <span className="text-[12px]">🔒</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ─── App Download CTA ────────────────────────────────── */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
          <div className="text-[16px] font-black mb-1">앱에서 계속 학습하기</div>
          <p className="text-[12px] text-white/60 mb-4">
            취약한 부분을 데일리 스냅으로 5~10분씩<br />
            꾸준히 보완하세요. 스트릭과 XP로 동기부여!
          </p>
          <div className="space-y-2">
            <button
              onClick={() => { setAppDownloadClicked(true); setShowPairing(true) }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-[#1A1A1A] rounded-xl text-[14px] font-bold"
            >
              <Apple size={16} /> iOS 앱 다운로드
            </button>
            <button
              onClick={() => { setAppDownloadClicked(true); setShowPairing(true) }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/10 border border-white/20 rounded-xl text-[14px] font-bold text-white"
            >
              <Download size={16} /> Android 앱 다운로드
            </button>
          </div>
        </div>

        {/* ─── Web Preview CTA ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
          <div className="text-[14px] font-bold text-[#1A1A1A] mb-2">지금 바로 웹에서 체험</div>
          <p className="text-[12px] text-[#6B6B6B] mb-4">앱 설치 없이 Education을 먼저 경험해보세요</p>
          <button
            onClick={() => router.push('/trainer/education')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E24B4A] text-white rounded-xl text-[14px] font-bold"
          >
            Education 체험하기 <ChevronRight size={16} />
          </button>
        </div>

        {/* Retry + Landing */}
        <div className="flex gap-3">
          <button
            onClick={() => { sessionStorage.removeItem('testResult'); router.push('/landing/test') }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-[#E5E5E5] bg-white rounded-xl text-[13px] text-[#6B6B6B]"
          >
            <RefreshCw size={14} /> 다시 풀기
          </button>
          <button
            onClick={() => router.push('/landing')}
            className="flex-1 py-3 border border-[#E5E5E5] bg-white rounded-xl text-[13px] text-[#6B6B6B]"
          >
            랜딩으로 가기
          </button>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
