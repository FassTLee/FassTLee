-- 탈퇴 접수 기록 테이블 (deletion_requests)
--
-- 적용 이력: 2026-08-04 오너가 Supabase SQL Editor에서 dev·prod 양측에 선적용.
--            본 파일은 그 최종 상태를 고정한 것으로, 재실행해도 안전하다.
--
-- 배경: /api/v1/user/delete는 FK 위반 시 202로 접수만 하고 기록은 console 로그뿐이었다.
--       Vercel 런타임 로그의 실제 조회 가능 범위가 약 33분에 불과함이 실측으로 확인되어
--       (2026-08-04, CC-10 STEP 2), 접수 요청이 사실상 유실되는 구조였다.
--
-- 보유 기간: 3년. 파기 목적이 아니라 처리 이력의 증빙이 목적이므로
--            삭제 실행과 함께 소멸하지 않는다. 자동 파기 로직 없음 — 별도 트랙.
--
-- profiles.id 타입: uuid NOT NULL, DEFAULT 없음 (dev·prod 동일, 2026-08-04 실측)
--
-- FK 미설정: 의도적. profiles.id 참조 FK 21개 중 20개가 ON DELETE NO ACTION이며,
--            여기에 FK를 추가하면 자식 행이 0건인 계정의 삭제(현재 정상 동작하는
--            200 경로)까지 차단된다. 또한 profiles 행이 실제로 삭제된 뒤에도
--            접수 기록은 남아야 한다.
--
-- 중복 접수 차단 안 함: 동일 사용자의 재요청도 실제 발생한 사실이므로 기록 대상이다.
--            UNIQUE를 걸면 API가 INSERT 실패를 처리해야 하고, 그 실패가 다시
--            조용히 무시될 위험이 생긴다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL,
  email           text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'received',
  processed_at    timestamptz,
  processing_note text
);

-- 접수 시점 결과. status(처리 상태)와 축이 다르므로 분리한다.
--   deleted    = 200, profiles 실제 삭제됨. 삭제되면 흔적이 사라지므로 반드시 기록
--   fk_blocked = 202, FK(23503) 위반으로 차단되어 접수만 됨
--   not_found  = 404, 대상 profiles 미매칭
-- intake_result='deleted'인 건은 접수와 동시에
--   status='completed', processed_at=now()로 기록한다(애플리케이션 책임).
ALTER TABLE public.deletion_requests
  ADD COLUMN IF NOT EXISTS intake_result text;

-- 이메일 출처. 소명 시 "본인이 지정한 주소"임을 구분하기 위함.
--   profile    = profiles.email 값을 사용자가 그대로 선택
--   user_input = 사용자가 직접 입력
-- profiles.email은 약 73%가 null이므로 user_input이 주 경로가 된다.
ALTER TABLE public.deletion_requests
  ADD COLUMN IF NOT EXISTS email_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deletion_requests_status_check'
  ) THEN
    ALTER TABLE public.deletion_requests
      ADD CONSTRAINT deletion_requests_status_check
      CHECK (status IN ('received','processing','completed','rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deletion_requests_intake_result_check'
  ) THEN
    ALTER TABLE public.deletion_requests
      ADD CONSTRAINT deletion_requests_intake_result_check
      CHECK (intake_result IN ('deleted','fk_blocked','not_found'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deletion_requests_email_source_check'
  ) THEN
    ALTER TABLE public.deletion_requests
      ADD CONSTRAINT deletion_requests_email_source_check
      CHECK (email_source IS NULL OR email_source IN ('profile','user_input'));
  END IF;
END $$;

-- 이미 NOT NULL이면 건너뛴다. 행이 있는 상태에서 무조건 실행하면 실패하기 때문이다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'deletion_requests'
      AND column_name  = 'intake_result'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.deletion_requests
      ALTER COLUMN intake_result SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS deletion_requests_profile_id_idx
  ON public.deletion_requests (profile_id);
CREATE INDEX IF NOT EXISTS deletion_requests_status_idx
  ON public.deletion_requests (status);
CREATE INDEX IF NOT EXISTS deletion_requests_intake_result_idx
  ON public.deletion_requests (intake_result);

-- RLS: 활성화하되 정책을 만들지 않는다.
-- anon·authenticated 전면 차단이 의도된 상태이며 누락이 아니다.
-- 접근은 service_role(RLS 우회)로만 이루어진다.
-- 탈퇴한 사용자는 인증 주체가 존재하지 않으므로 authenticated 정책이 성립하지 않는다.
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

COMMIT;
