-- Kinepia 동의 취득 체계
-- profiles.id: uuid (NextAuth stableId, auth.users 미사용)
-- 서버 쓰기는 service_role(supabaseAdmin) 경유. anon 접근은 RLS로 전면 차단.

BEGIN;

-- 1. 동의 이력 테이블 (정본)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type  text NOT NULL,          -- 'terms' | 'privacy' | 'marketing'
  agreed        boolean NOT NULL,
  version       text NOT NULL,          -- 약관 시행일. 예 '2026-04-14'
  agreed_at     timestamptz NOT NULL DEFAULT now(),
  source        text                    -- 'signup' | 'retroactive' | 'settings'
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user
  ON public.user_consents (user_id, consent_type, agreed_at DESC);

-- 2. 게이트 판정용 캐시 컬럼
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_completed_at timestamptz;

-- 3. RLS — 정책 없이 활성화. anon 전면 차단, service_role만 접근
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

COMMIT;