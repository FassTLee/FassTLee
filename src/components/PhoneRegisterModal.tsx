'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Props {
  onClose: () => void
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function PhoneRegisterModal({ onClose }: Props) {
  const { data: session } = useSession()
  const [phone, setPhone]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
    setError('')
  }

  const handleSave = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('올바른 휴대폰 번호를 입력해주세요')
      return
    }
    setSaving(true)
    try {
      const provider = session?.user?.provider ?? 'unknown'
      const res = await fetch('/api/v1/update-phone', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, provider }),
      })
      if (res.ok) {
        onClose()
      } else {
        setError('저장에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
    setSaving(false)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('phone_modal_dismissed', '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
        {/* 헤더 */}
        <div className="text-center">
          <div className="text-[36px] mb-2">📱</div>
          <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">휴대폰 번호 등록</h2>
          <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
            카카오·구글·네이버 어디서 로그인해도<br />
            같은 학습 데이터를 이어서 사용할 수 있어요.
          </p>
        </div>

        {/* 입력 */}
        <div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="010-0000-0000"
            value={phone}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[15px] text-[#1A1A1A] outline-none focus:border-[#00A651] transition-colors"
          />
          {error && (
            <p className="text-[12px] text-[#E24B4A] mt-1.5">{error}</p>
          )}
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-[#00A651] text-white rounded-xl text-[15px] font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              저장 중...
            </>
          ) : (
            '저장하기'
          )}
        </button>

        {/* 다음에 입력 */}
        <button
          onClick={handleDismiss}
          className="w-full py-2 text-[13px] text-gray-400"
        >
          다음에 입력
        </button>
      </div>
    </div>
  )
}
