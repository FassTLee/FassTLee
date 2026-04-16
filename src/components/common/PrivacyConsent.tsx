'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, ExternalLink, Shield } from 'lucide-react'

interface PrivacyConsentProps {
  onAccept: () => void
  onDecline?: () => void
  mode?: 'modal' | 'inline'
}

interface ConsentItem {
  id: string
  label: string
  required: boolean
  detail: string
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    id: 'service',
    label: '서비스 이용약관 동의',
    required: true,
    detail: 'Kinepia 서비스 이용을 위한 기본 약관입니다. 서비스 제공, 콘텐츠 학습, 계정 관리 등에 관한 내용을 포함합니다.',
  },
  {
    id: 'privacy',
    label: '개인정보 수집·이용 동의',
    required: true,
    detail: '수집항목: 이름, 이메일 (Google 계정 연동 시)\n이용목적: 학습 진도 저장, 맞춤 추천, 서비스 개선\n보유기간: 회원 탈퇴 후 즉시 삭제',
  },
  {
    id: 'marketing',
    label: '마케팅 정보 수신 동의',
    required: false,
    detail: '신규 강의, 이벤트, 업데이트 소식을 이메일로 받아볼 수 있습니다. 언제든지 수신 거부할 수 있습니다.',
  },
]

export function PrivacyConsent({ onAccept, onDecline, mode = 'modal' }: PrivacyConsentProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const allRequired = CONSENT_ITEMS.filter((i) => i.required).every((i) => checked[i.id])

  const toggleAll = () => {
    const allChecked = CONSENT_ITEMS.every((i) => checked[i.id])
    const newState: Record<string, boolean> = {}
    CONSENT_ITEMS.forEach((i) => { newState[i.id] = !allChecked })
    setChecked(newState)
  }

  const wrapper = mode === 'modal'
    ? 'fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-0'
    : ''

  const inner = mode === 'modal'
    ? 'bg-white w-full max-w-lg rounded-t-3xl pb-8'
    : 'bg-white rounded-2xl border border-[#E5E5E5]'

  return (
    <div className={wrapper}>
      <div className={inner}>
        {/* Handle (modal) */}
        {mode === 'modal' && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
          </div>
        )}

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-[#E24B4A]" />
            <h2 className="text-[18px] font-black text-[#1A1A1A]">서비스 이용 동의</h2>
          </div>
          <p className="text-[12px] text-[#6B6B6B]">
            Kinepia 이용을 위한 약관에 동의해 주세요.
          </p>
        </div>

        {/* 전체 동의 */}
        <div className="mx-6 my-3">
          <button
            onClick={toggleAll}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
              CONSENT_ITEMS.every((i) => checked[i.id])
                ? 'border-[#1A1A1A] bg-[#1A1A1A]'
                : 'border-[#E5E5E5] bg-[#F5F5F3]'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              CONSENT_ITEMS.every((i) => checked[i.id])
                ? 'bg-white border-white'
                : 'border-[#CCCCCC]'
            }`}>
              {CONSENT_ITEMS.every((i) => checked[i.id]) && (
                <Check size={12} className="text-[#1A1A1A]" />
              )}
            </div>
            <span className={`text-[15px] font-bold ${
              CONSENT_ITEMS.every((i) => checked[i.id]) ? 'text-white' : 'text-[#1A1A1A]'
            }`}>
              전체 동의하기
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-[#F5F5F3] mb-2" />

        {/* Individual items */}
        <div className="px-6 space-y-2">
          {CONSENT_ITEMS.map((item) => (
            <div key={item.id}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    checked[item.id]
                      ? 'bg-[#1A1A1A] border-[#1A1A1A]'
                      : 'border-[#CCCCCC]'
                  }`}
                >
                  {checked[item.id] && <Check size={11} className="text-white" />}
                </button>
                <span className="flex-1 text-[13px] text-[#1A1A1A]">
                  {item.label}
                  {item.required
                    ? <span className="text-[#E24B4A] ml-1 text-[11px]">(필수)</span>
                    : <span className="text-[#ADADAD] ml-1 text-[11px]">(선택)</span>
                  }
                </span>
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="p-1"
                >
                  {expanded === item.id
                    ? <ChevronUp size={14} className="text-[#ADADAD]" />
                    : <ChevronDown size={14} className="text-[#ADADAD]" />
                  }
                </button>
              </div>
              {expanded === item.id && (
                <div className="ml-8 mt-1.5 px-3 py-2.5 bg-[#F5F5F3] rounded-lg">
                  <p className="text-[11px] text-[#6B6B6B] leading-relaxed whitespace-pre-line">
                    {item.detail}
                  </p>
                  <button className="flex items-center gap-1 text-[11px] text-[#378ADD] mt-1.5">
                    전문 보기 <ExternalLink size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 mt-5 space-y-2">
          <button
            onClick={onAccept}
            disabled={!allRequired}
            className="w-full py-4 bg-[#E24B4A] disabled:opacity-40 text-white rounded-xl text-[15px] font-bold"
          >
            동의하고 시작하기
          </button>
          {onDecline && (
            <button
              onClick={onDecline}
              className="w-full py-3 text-[13px] text-[#ADADAD]"
            >
              나중에 하기
            </button>
          )}
        </div>

        <p className="text-[10px] text-[#ADADAD] text-center mt-3 px-6 leading-relaxed">
          개인정보 처리방침에 따라 최소한의 정보만 수집됩니다.
          언제든지 설정에서 데이터 삭제를 요청할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
