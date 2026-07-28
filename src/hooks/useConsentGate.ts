'use client'

// useConsentGate — 가입 동의 게이트 판정 단일 소스
// dashboard(1차)·lesson(2차) 두 화면이 이 훅으로만 판정한다. 복붙 금지.
//
// 판정: 로그인 상태에서 profiles.consent_completed_at 이 없으면 needsConsent.
// source: 계정 생성 시각 기준 — created_at 이 최근(SIGNUP_WINDOW_MS 이내)이면
//         'signup'(신규 가입 직후), 아니면 'retroactive'(기존 사용자 소급).

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export type ConsentSource = 'signup' | 'retroactive'

export interface ConsentGateState {
  loading: boolean          // 판정 진행 중 (profile-me 조회 전/중)
  needsConsent: boolean     // 로그인 + 미동의 → 모달 노출·수집 차단
  source: ConsentSource     // 동의 기록에 남길 맥락
  markConsented: () => void // 동의 성공 후 게이트 즉시 해제
}

// 신규 가입 직후 대시보드 도달까지의 여유. 이 안이면 signup 으로 간주.
// 기존 412명은 모두 2026-07-25(마이그레이션) 이전 생성이라 항상 retroactive.
const SIGNUP_WINDOW_MS = 10 * 60 * 1000

export function useConsentGate(): ConsentGateState {
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [needsConsent, setNeedsConsent] = useState(false)
  const [source, setSource] = useState<ConsentSource>('retroactive')

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      setNeedsConsent(false)
      setLoading(false)
      return
    }

    let cancelled = false
    fetch('/api/v1/profile-me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((pm) => {
        if (cancelled) return
        if (pm?.consentCompletedAt) {
          setNeedsConsent(false)
          return
        }
        setNeedsConsent(true)
        const created = pm?.createdAt ? new Date(pm.createdAt).getTime() : 0
        setSource(created && Date.now() - created < SIGNUP_WINDOW_MS ? 'signup' : 'retroactive')
      })
      .catch(() => {
        // 조회 실패 시 게이트를 걸지 않음(fail-open) — 일시적 네트워크 오류로
        // 로그인 사용자를 잠그지 않기 위함. 다음 진입 시 재판정된다.
        if (!cancelled) setNeedsConsent(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [status])

  const markConsented = useCallback(() => setNeedsConsent(false), [])

  return { loading, needsConsent, source, markConsented }
}
