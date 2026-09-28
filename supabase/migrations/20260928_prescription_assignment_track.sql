-- 20260928: 배정 트랙 DDL — 성향별 학습 순서 처방과 대조군 기록
--
-- 적용 이력:
--   dev  2026-09-28  오너가 Supabase SQL Editor에서 선적용, 검증 통과
--   prod 2026-09-28  (서울 리전 신 prod) 선적용, 검증 통과
--
-- 멱등성: 모든 구문이 재실행 안전하다 (조건부 추가·정의 기준 교체·뷰 재정의).
--   적용 전 로컬 Postgres 재현에서 2회 연속 실행과 합성 입력 23건 검증을 통과했다.
--
-- 사전 실측 (2026-09-27~28 KST, dev·prod 동일):
--   profiles: prescription_group text · prescription_assigned_at timestamptz 존재,
--             prescription_version · prescription_bucket 부재, CHECK 는 profiles_role_check 1건,
--             prescription_group 전부 NULL (prod 415 / dev 2)
--   chapter_session_logs: 15컬럼, prescribed_order · prescription_basis 부재, CHECK 는 exit_point 1건
--   learning_style_events: 이름 충돌 없음
--   public 새 테이블 기본 권한: anon · authenticated · service_role 모두 전권 (default ACL 양측 동일)
--   prod 에만 이벤트 트리거 ensure_rls(새 public 테이블 RLS 자동 활성)가 있고 dev 에는 없다
--   → 이 DDL 은 RLS 와 권한을 모두 명시한다. 프로젝트 기본값에 기대지 않는다
-- 설계 결정 (오너 승인 2026-09-28):
--   유형 확인 팝업은 동의 확인만 받는다. 응답은 이벤트로 기록하고 처방·표시 유형은 바꾸지 않는다.
--   "아니다" 응답 후 재진단은 learning_style_responses 에 source='popup' 으로 남긴다.
--   처방 근거는 none / seed / confirmed 3값이다.
BEGIN;

-- 1. profiles — 배정 규칙 식별자와 해시 버킷
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prescription_version text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prescription_bucket  smallint;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_prescription_group_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_prescription_group_check
      CHECK (prescription_group IN ('treatment', 'control'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_prescription_bucket_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_prescription_bucket_check
      CHECK (prescription_bucket BETWEEN 0 AND 99);
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.prescription_group IS
  '처방 배정 군. treatment=성향별 순서 처방, control=기본 순서. 가입 시 해시로 배정한다. NULL=미배정(배정 로직 배포 이전 가입자 또는 배정 실패)이며 분석 모집단에서 제외한다. 탐구형은 별도 군 없이 양군에 배정되어 A/A 검증층이 된다.';
COMMENT ON COLUMN public.profiles.prescription_version IS
  '배정 규칙 식별자. 비율·임계·순열표 정의는 코드 상수 1파일에 있고 이 값으로 적용 규칙을 찾는다.';
COMMENT ON COLUMN public.profiles.prescription_bucket IS
  '배정 해시 버킷(0~99). 군 분배 비율 점검의 근거.';

-- 2. chapter_session_logs — 세션마다 적용한 순서와 그 근거
ALTER TABLE public.chapter_session_logs ADD COLUMN IF NOT EXISTS prescribed_order   smallint[];
ALTER TABLE public.chapter_session_logs ADD COLUMN IF NOT EXISTS prescription_basis text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'csl_prescribed_order_check') THEN
    ALTER TABLE public.chapter_session_logs ADD CONSTRAINT csl_prescribed_order_check
      CHECK (prescribed_order IS NULL
             OR (cardinality(prescribed_order) = 3
                 AND array_ndims(prescribed_order) = 1
                 AND prescribed_order @> '{0,1,2}'::smallint[]
                 AND prescribed_order <@ '{0,1,2}'::smallint[]));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'csl_prescription_basis_check') THEN
    ALTER TABLE public.chapter_session_logs ADD CONSTRAINT csl_prescription_basis_check
      CHECK (prescription_basis IN ('none', 'seed', 'confirmed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'csl_prescription_pair_check') THEN
    ALTER TABLE public.chapter_session_logs ADD CONSTRAINT csl_prescription_pair_check
      CHECK ((prescribed_order IS NULL) = (prescription_basis IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN public.chapter_session_logs.prescribed_order IS
  '이 세션에 적용한 카드 내부 순열(0=학습 내용, 1=체크포인트, 2=미니퀴즈). 미니퀴즈 없는 카드의 생략 전 원형을 기록한다. 대조군과 임계 전 세션도 {0,1,2}로 기록한다. NULL=레슨 외 세션 또는 기록 이전 세션.';
COMMENT ON COLUMN public.chapter_session_logs.prescription_basis IS
  '순서의 근거. none=처방 없음(대조군·임계 전), seed=설문 시드(learning_style) 기준, confirmed=행동 기반 확정 유형 기준(분류 로직 도입 후). prescribed_order 와 함께 기록한다.';

-- 3. learning_style_events — 유형 관련 사건의 추가 전용 기록
-- user_id 에 profiles FK 를 걸지 않은 것은 의도다 (선례: learning_style_responses).
-- chapter_id · certification_id 는 uuid 형이라 slug 가 섞여 들어올 수 없다.
CREATE TABLE IF NOT EXISTS public.learning_style_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  event_type           text NOT NULL,
  style                text,
  response             text,
  model_version        text,
  prescription_group   text,
  prescription_version text,
  chapter_id           uuid,
  certification_id     uuid,
  detail               jsonb,
  occurred_at          timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lse_event_type_check
    CHECK (event_type IN ('threshold_reached', 'popup_shown', 'popup_response', 'style_computed')),
  CONSTRAINT lse_style_check
    CHECK (style IN ('spotter', 'planner', 'repeater', 'explorer')),
  CONSTRAINT lse_response_check
    CHECK (response IN ('agree', 'disagree', 'unsure', 'dismissed')),
  CONSTRAINT lse_response_scope_check
    CHECK ((event_type = 'popup_response') = (response IS NOT NULL)),
  CONSTRAINT lse_group_check
    CHECK (prescription_group IN ('treatment', 'control'))
);

CREATE INDEX IF NOT EXISTS idx_lse_user_occurred
  ON public.learning_style_events (user_id, occurred_at DESC);
-- 임계 도달은 사용자당 1회. lesson-complete 중복 호출로 두 번 기록되는 것을 막는다.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lse_threshold_once
  ON public.learning_style_events (user_id) WHERE event_type = 'threshold_reached';

-- 정책 0개는 의도이며 누락이 아니다. auth.uid() 가 항상 NULL 이라 authenticated 정책이 성립하지 않는다.
-- 접근은 service_role 전용. UPDATE 권한을 주지 않아 DB 수준에서 추가 전용을 강제한다.
-- DELETE 는 탈퇴 처리 등 운영 삭제를 위해 남긴다.
ALTER TABLE public.learning_style_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_style_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.learning_style_events TO service_role;

COMMENT ON TABLE public.learning_style_events IS
  '학습자 유형 관련 사건의 추가 전용 기록(임계 도달·팝업 제시·팝업 응답·행동 분류 산출). 처방 적용 기록은 chapter_session_logs.prescribed_order 가, 설문 응답 원본은 learning_style_responses 가 담당하며 여기 중복 기록하지 않는다.';
COMMENT ON COLUMN public.learning_style_events.style IS
  'popup_shown·popup_response: 제시한 유형(설문 시드). style_computed: 산출된 유형. threshold_reached: 임계 도달 시점의 시드.';
COMMENT ON COLUMN public.learning_style_events.response IS
  'popup_response 전용. agree / disagree / unsure / dismissed(닫기). 처방과 표시 유형을 바꾸지 않는 라벨 기록이다.';
COMMENT ON COLUMN public.learning_style_events.detail IS
  '사건별 부가 정보(임계 판정 시 카드 수, 팝업 문구 버전, 응답 소요 ms 등).';

-- 4. learning_style_responses — 팝업 경유 재진단 경로 추가
-- 기존 source CHECK 는 이름과 무관하게 정의로 찾아 교체한다.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.learning_style_responses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE public.learning_style_responses DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE public.learning_style_responses ADD CONSTRAINT lsr_source_check
    CHECK (source IN ('landing', 'deferred_sync', 'onboarding', 'backfill', 'popup'));
END $$;

COMMENT ON COLUMN public.learning_style_responses.source IS
  '응답 경로. landing=랜딩 4문항 즉시 저장, deferred_sync=지연 경로로 뒤늦게 올라온 응답, onboarding=온보딩 8문항, backfill=기존 learning_style_answers 이관분, popup=유형 확인 팝업에서 "아니다" 후 재진단.';

-- 5. 정합성 뷰 — 배정 기록 누락 탐지 추가
-- CREATE OR REPLACE VIEW 는 기존 뷰 옵션을 지우므로 security_invoker 를 다시 명시한다.
CREATE OR REPLACE VIEW public.v_learning_style_integrity
WITH (security_invoker = true) AS
SELECT
  p.id AS user_id,
  p.learning_style,
  p.learning_style_confirmed,
  p.style_tested_at,
  p.prescription_group,
  r.response_count,
  r.last_responded_at,
  CASE
    WHEN p.learning_style IS NOT NULL AND r.response_count IS NULL THEN 'style_without_history'
    WHEN p.learning_style IS NULL AND r.response_count > 0        THEN 'history_without_style'
    WHEN p.learning_style_confirmed IS NOT NULL
         AND p.style_confirmed_at IS NULL                          THEN 'confirmed_without_time'
    WHEN p.prescription_group IS NOT NULL
         AND p.prescription_assigned_at IS NULL                    THEN 'group_without_time'
    WHEN p.prescription_group IS NOT NULL
         AND (p.prescription_version IS NULL
              OR p.prescription_bucket IS NULL)                    THEN 'group_without_version'
    WHEN p.prescription_group IS NULL
         AND (p.prescription_version IS NOT NULL
              OR p.prescription_bucket IS NOT NULL)                THEN 'version_without_group'
    ELSE 'ok'
  END AS integrity_status,
  p.prescription_version,
  p.prescription_bucket
FROM public.profiles p
LEFT JOIN (
  SELECT user_id,
         count(*)          AS response_count,
         max(responded_at) AS last_responded_at
  FROM public.learning_style_responses
  GROUP BY user_id
) r ON r.user_id = p.id;

REVOKE ALL ON public.v_learning_style_integrity FROM PUBLIC, anon, authenticated;

COMMENT ON VIEW public.v_learning_style_integrity IS
  '설문 시드·확정값·배정 기록의 정합성 탐지. integrity_status <> ''ok'' 인 행이 조사 대상. anon·authenticated 권한 없음, security_invoker.';

COMMIT;

-- 선적용 검증 결과 (dev·prod 동일 구조):
--   신규 컬럼 4개 null 허용 / learning_style_events 13컬럼
--   CHECK 14건 (profiles 3 · chapter_session_logs 4 · learning_style_events 5 · learning_style_responses 2)
--   learning_style_events: rls=true / policies=0 / anon·authenticated 권한 없음 /
--                          service_role SELECT·INSERT·DELETE 가능, UPDATE 불가
--   v_learning_style_integrity: security_invoker=true / anon 권한 없음
--   인덱스 3건 (pkey · idx_lse_user_occurred · uq_lse_threshold_once)
--   정합성 뷰: prod ok 408 · history_without_style 6 · style_without_history 1 / dev ok 2
--              (배정 전이라 group_without_version · version_without_group 0건)
