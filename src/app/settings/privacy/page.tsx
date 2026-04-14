'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Trash2, Download, ChevronLeft, AlertTriangle, Check } from 'lucide-react'

export default function PrivacySettingsPage() {
  const router = useRouter()
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting' | 'done'>('idle')
  const [confirmText, setConfirmText] = useState('')

  const handleDeleteRequest = async () => {
    if (confirmText !== '삭제 동의') return
    setDeleteStep('deleting')

    try {
      const res = await fetch('/api/v1/user/delete', { method: 'DELETE' })
      if (res.ok) {
        setDeleteStep('done')
      } else {
        alert('삭제 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
        setDeleteStep('idle')
      }
    } catch {
      alert('네트워크 오류. 잠시 후 다시 시도해 주세요.')
      setDeleteStep('idle')
    }
  }

  if (deleteStep === 'done') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center border border-[#E5E5E5]">
          <div className="w-16 h-16 bg-[#639922]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-[#639922]" />
          </div>
          <h2 className="text-[20px] font-black text-[#1A1A1A] mb-2">삭제 요청 완료</h2>
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">
            모든 개인정보 삭제가 요청되었습니다.<br />
            최대 24시간 이내에 완전히 처리됩니다.
          </p>
          <button
            onClick={() => router.push('/landing')}
            className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-xl text-[14px] font-semibold"
          >
            메인으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center">
            <ChevronLeft size={20} className="text-[#6B6B6B]" />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#E24B4A]" />
            <h1 className="text-[16px] font-bold text-[#1A1A1A]">개인정보 관리</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* 수집 현황 */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <h2 className="text-[15px] font-bold text-[#1A1A1A] mb-4">📋 수집 중인 정보</h2>
          <div className="space-y-3">
            {[
              { label: '이름', value: '박트레이너', source: 'Google 계정' },
              { label: '이메일', value: 'tra***@fitdoor.com', source: 'Google 계정 (마스킹)' },
              { label: '학습 진도', value: '로컬 저장', source: 'Zustand (브라우저)' },
              { label: '테스트 결과', value: '저장됨', source: 'Supabase (암호화)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#F5F5F3] last:border-0">
                <div>
                  <div className="text-[13px] font-medium text-[#1A1A1A]">{item.label}</div>
                  <div className="text-[11px] text-[#ADADAD]">{item.source}</div>
                </div>
                <span className="text-[12px] text-[#6B6B6B] bg-[#F5F5F3] px-2.5 py-1 rounded-lg">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 보안 현황 */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <h2 className="text-[15px] font-bold text-[#1A1A1A] mb-4">🔒 보안 현황</h2>
          <div className="space-y-2.5">
            {[
              { label: 'AES-256 암호화', status: '적용' },
              { label: 'Supabase RLS', status: '활성화' },
              { label: 'JWT 만료', status: '24시간' },
              { label: '최소 수집 원칙', status: '준수' },
              { label: '개인정보보호법', status: '준수' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[13px] text-[#1A1A1A]">{item.label}</span>
                <span className="text-[11px] font-semibold text-[#639922] bg-[#639922]/10 px-2.5 py-0.5 rounded-full">
                  ✓ {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 데이터 내보내기 */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <h2 className="text-[15px] font-bold text-[#1A1A1A] mb-2">📤 내 데이터 내보내기</h2>
          <p className="text-[12px] text-[#6B6B6B] mb-3">
            수집된 모든 개인정보를 JSON 파일로 다운로드할 수 있습니다.
          </p>
          <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#F5F5F3] border border-[#E5E5E5] rounded-xl text-[13px] font-medium text-[#1A1A1A]">
            <Download size={15} /> 데이터 다운로드
          </button>
        </div>

        {/* 데이터 삭제 */}
        <div className="bg-white rounded-2xl border border-[#E24B4A]/30 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 size={16} className="text-[#E24B4A]" />
            <h2 className="text-[15px] font-bold text-[#E24B4A]">개인정보 삭제 요청</h2>
          </div>
          <p className="text-[12px] text-[#6B6B6B] mb-4 leading-relaxed">
            회원 탈퇴 및 모든 개인정보 삭제를 요청합니다.
            이 작업은 되돌릴 수 없으며, 학습 기록이 모두 삭제됩니다.
          </p>

          {deleteStep === 'idle' && (
            <button
              onClick={() => setDeleteStep('confirm')}
              className="w-full py-3 border-2 border-[#E24B4A] text-[#E24B4A] rounded-xl text-[13px] font-semibold"
            >
              삭제 요청하기
            </button>
          )}

          {deleteStep === 'confirm' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-[#FFF1F1] rounded-xl p-3">
                <AlertTriangle size={16} className="text-[#E24B4A] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#E24B4A] leading-relaxed">
                  계속하면 학습 진도, 배지, 테스트 결과를 포함한 <strong>모든 데이터가 영구 삭제</strong>됩니다.
                </p>
              </div>
              <div>
                <label className="text-[12px] text-[#6B6B6B] mb-1.5 block">
                  확인을 위해 <strong>&apos;삭제 동의&apos;</strong>를 입력하세요
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="삭제 동의"
                  className="w-full px-4 py-3 bg-[#F5F5F3] border border-[#E5E5E5] rounded-xl text-[14px] outline-none focus:border-[#E24B4A]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDeleteStep('idle'); setConfirmText('') }}
                  className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-[13px] text-[#6B6B6B]"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteRequest}
                  disabled={confirmText !== '삭제 동의'}
                  className="flex-1 py-3 bg-[#E24B4A] disabled:opacity-40 text-white rounded-xl text-[13px] font-bold"
                >
                  최종 삭제
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'deleting' && (
            <div className="text-center py-4">
              <div className="text-[13px] text-[#6B6B6B]">삭제 처리 중...</div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
