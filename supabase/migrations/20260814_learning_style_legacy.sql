-- learning_style 4유형 체계 전환에 따른 구 2값 보존 및 초기화
--
-- 적용 이력 (SQL Editor 선적용):
--   dev  jgweeoeikhdjcgkitjfl  2026-08-14
--   prod sbketzgadjvzedbayesc  2026-08-14
--
-- 배경:
--   구 체계는 설문이 4유형(conceptualizer/memorizer/planner/intensive)을
--   산출한 뒤 LESSON_STYLE_MAP 이 2값(memorizer/conceptualizer)으로
--   축약해 저장했다. 이 축약으로 원본 4유형이 소실되어, 구 2값에서
--   신 4키(spotter/planner/repeater/explorer)로의 신뢰 가능한 매핑이
--   불가능하다.
--   따라서 구 2값은 legacy 컬럼에 보존하고 learning_style 은 NULL 로
--   초기화한다. 해당 사용자는 미분류 상태에서 재측정한다.
--
-- 확인된 타입: profiles.learning_style = text (CHECK 제약 없음)
--
-- 멱등성:
--   ADD COLUMN IF NOT EXISTS / WHERE 조건으로 재실행 안전.
--   마지막 UPDATE 는 구 2값만 대상으로 하므로 신 4키를 훼손하지 않는다.

BEGIN;

-- 1) 보존 컬럼
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS learning_style_legacy text;

COMMENT ON COLUMN public.profiles.learning_style_legacy IS
  '구 2값 체계(memorizer/conceptualizer) 보존용. 2026-08-12 학습유형 명칭 개편 시 이관. 신규 쓰기 없음, 분석 전용.';

-- 2) 구 2값 백필
UPDATE public.profiles
   SET learning_style_legacy = learning_style
 WHERE learning_style IN ('memorizer', 'conceptualizer')
   AND learning_style_legacy IS NULL;

-- 3) 구 2값을 미분류로 전환 (신 4키는 대상 아님)
UPDATE public.profiles
   SET learning_style = NULL
 WHERE learning_style IN ('memorizer', 'conceptualizer')
   AND learning_style_legacy IS NOT NULL;

COMMIT;
