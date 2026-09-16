-- 적용 이력:
--   dev  jgweeoeikhdjcgkitjfl  2026-09-16
--   prod sbketzgadjvzedbayesc  2026-09-16
--   오너가 Supabase SQL Editor에서 선적용, 검증 통과
--
-- 배경: learning_style은 도입 이래 설문 결과만 담아온 컬럼이다.
-- 행동 기반 확정값을 같은 컬럼에 쓰면 설문값과 구분되지 않아
-- "설문 대비 행동이 얼마나 다른가"를 산출할 수 없다.
-- 3층 구조: learning_style_legacy(v1 설문) /
--           learning_style(v2 설문 시드) /
--           learning_style_confirmed(행동 확정)
--
-- 확인된 타입 (2026-09-16 dev·prod 실측, 양측 동일):
-- learning_style text / learning_style_legacy text /
-- learning_style_answers jsonb / style_tested_at timestamptz
--
-- 멱등성: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, 제약은 pg_constraint 조건부,
-- backfill은 NOT EXISTS 가드. 재실행 안전.
--
-- backfill의 schema_version 판정: 배열에 conceptualizer/memorizer/intensive가
-- 하나라도 있으면 1, 아니면 2. planner는 양쪽 체계에 모두 있으므로
-- 단독 판정 근거로 쓰지 않는다.
-- backfill의 is_tie는 false 고정. 이관분은 원 채점 결과를 알 수 없으며
-- 응답 배열이 남아 있어 필요 시 재계산 가능하다.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS learning_style_confirmed text,
  ADD COLUMN IF NOT EXISTS style_confirmed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS prescription_group       text,
  ADD COLUMN IF NOT EXISTS prescription_assigned_at timestamptz;

COMMENT ON COLUMN public.profiles.learning_style IS
  '설문 시드값(v2 체계). 행동 기반 확정값은 learning_style_confirmed. 이 컬럼에 행동 결과를 쓰지 않는다.';

COMMENT ON COLUMN public.profiles.learning_style_confirmed IS
  '행동 데이터 기반 확정 유형. 설문 시드는 learning_style. 확정 절차를 거치지 않으면 NULL.';

COMMENT ON COLUMN public.profiles.style_confirmed_at IS
  '행동 기반 확정 시각. 설문 시각은 style_tested_at.';

COMMENT ON COLUMN public.profiles.prescription_group IS
  '처방 배정 층. treatment=처방 적용, control=대조군, explorer_baseline=탐구형 무처치. NULL은 배정 로직 배포 이전 가입자이며 분석 제외.';

COMMENT ON COLUMN public.profiles.prescription_assigned_at IS
  '배정 시각. 대조군 모집단 판정 기준.';

COMMIT;

BEGIN;

-- user_id에 profiles FK를 걸지 않은 것은 의도다.
-- profiles 참조 FK 21건 중 NO ACTION 5건이 탈퇴를 차단하고 있으며
-- 여기에 FK를 더하면 차단자가 늘어난다.
-- 이력은 분석 자산이므로 CASCADE 삭제도 부적절하다.
CREATE TABLE IF NOT EXISTS public.learning_style_responses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  schema_version smallint NOT NULL DEFAULT 2,
  source         text NOT NULL,
  answers        jsonb NOT NULL,
  answer_count   smallint NOT NULL,
  computed_style text,
  is_tie         boolean NOT NULL DEFAULT false,
  responded_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- source: 응답이 어느 경로로 들어왔는지. 시드 이관 성공률 측정의 근거가 된다.
--   landing        = 랜딩 4문항, 로그인 상태에서 직접 저장
--   landing_guest  = 랜딩 4문항, 게스트로 받아 가입 시 이관
--   onboarding     = 온보딩 8문항
--   backfill       = 기존 learning_style_answers 이관분
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lsr_source_check') THEN
    ALTER TABLE public.learning_style_responses
      ADD CONSTRAINT lsr_source_check
      CHECK (source IN ('landing', 'landing_guest', 'onboarding', 'backfill'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lsr_schema_version_check') THEN
    ALTER TABLE public.learning_style_responses
      ADD CONSTRAINT lsr_schema_version_check
      CHECK (schema_version IN (1, 2));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lsr_user_responded
  ON public.learning_style_responses (user_id, responded_at DESC);

-- 정책 0개는 의도이며 누락이 아니다.
-- 이 앱은 Supabase Auth를 쓰지 않아 auth.uid()가 항상 NULL이므로
-- authenticated 정책이 성립하지 않는다.
-- 접근은 service_role 전용.
-- 선례: 20260725_add_user_consents.sql, 20260804_add_deletion_requests.sql
ALTER TABLE public.learning_style_responses ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.learning_style_responses IS
  '설문 응답 이력. 시점별로 적재하며 덮어쓰지 않는다. schema_version 1은 구 4종(conceptualizer/memorizer/planner/intensive)이며 신 4키로 변환 불가.';

COMMENT ON COLUMN public.learning_style_responses.is_tie IS
  '최다 득표 동점 여부. 동점 후보는 answers에서 재계산 가능하므로 별도 저장하지 않는다.';

COMMIT;

CREATE OR REPLACE VIEW public.v_learning_style_integrity AS
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
    ELSE 'ok'
  END AS integrity_status
FROM public.profiles p
LEFT JOIN (
  SELECT user_id,
         count(*)          AS response_count,
         max(responded_at) AS last_responded_at
  FROM public.learning_style_responses
  GROUP BY user_id
) r ON r.user_id = p.id;

COMMENT ON VIEW public.v_learning_style_integrity IS
  '설문 시드·확정값·배정 기록의 정합성 탐지. integrity_status <> ''ok'' 인 행이 조사 대상.';

INSERT INTO public.learning_style_responses
  (user_id, schema_version, source, answers, answer_count, computed_style, is_tie, responded_at)
SELECT
  p.id,
  CASE WHEN p.learning_style_answers::text ~ '(conceptualizer|memorizer|intensive)'
       THEN 1 ELSE 2 END,
  'backfill',
  p.learning_style_answers,
  jsonb_array_length(p.learning_style_answers),
  COALESCE(p.learning_style, p.learning_style_legacy),
  false,
  COALESCE(p.style_tested_at, now())
FROM public.profiles p
WHERE p.learning_style_answers IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.learning_style_responses r
    WHERE r.user_id = p.id AND r.source = 'backfill'
  );

-- 선적용 검증 결과:
-- dev  : 컬럼 4 / 테이블 10컬럼 / CHECK 2 · PK 1 · 인덱스 2 /
--        rls_enabled=true · policy_count=0 / backfill v2 1건
-- prod : 동일 구조 / backfill v1 6건 · v2 2건, 전부 8문항 /
--        뷰 ok 408 · history_without_style 6 · style_without_history 1
-- history_without_style 6건은 20260814에서 구 2값을 legacy로 옮기고
-- learning_style을 비운 결과이며 정합성 위반이 아니다.
