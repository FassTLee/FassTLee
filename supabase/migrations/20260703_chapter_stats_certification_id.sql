-- ================================================================
-- chapter_stats: certification_id 컬럼 추가
--
-- 배경: IIPA Lv1/Lv2처럼 같은 chapter_id를 여러 자격증이 공유하는
-- 경우, 기존 (user_id, chapter_id) 유일키만으로는 Lv1 진도와 Lv2
-- 진도가 하나의 행으로 합쳐져서 한쪽 완료가 다른 쪽에도 완료로
-- 보이는 문제가 있었음.
--
-- 실행: Supabase SQL Editor에서 전체 실행 (직접 실행 필요 —
-- Supabase JS 클라이언트로는 DDL 실행 불가)
-- ================================================================

BEGIN;

-- 1. certification_id 컬럼 추가 (nullable — 대부분의 콘텐츠는 자격증
--    간 공유되지 않으므로 굳이 채울 필요 없음)
ALTER TABLE chapter_stats
  ADD COLUMN IF NOT EXISTS certification_id uuid REFERENCES certifications(id);

-- 2. 기존 (user_id, chapter_id) 유일 제약/인덱스 제거
--    이름을 정확히 알 수 없으므로 pg_constraint/pg_indexes를 조회해
--    동적으로 찾아서 제거 (실제 이름이 무엇이든 안전하게 동작)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- (user_id, chapter_id) 정확히 일치하는 UNIQUE 제약 제거
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'chapter_stats'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(attname::text ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)
      ) = ARRAY['user_id','chapter_id']::text[]
  LOOP
    EXECUTE format('ALTER TABLE chapter_stats DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE '기존 UNIQUE 제약 제거: %', r.conname;
  END LOOP;

  -- (user_id, chapter_id) 유일 인덱스(제약 형태가 아닌 순수 인덱스인 경우) 제거
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'chapter_stats'
      AND indexdef ILIKE '%UNIQUE%(user_id, chapter_id)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
    RAISE NOTICE '기존 UNIQUE 인덱스 제거: %', r.indexname;
  END LOOP;
END $$;

-- 3. partial unique index 2개로 분리
--    - certification_id가 NULL인 행(비공유 콘텐츠, 레거시)은 (user_id, chapter_id)만으로 유일
--    - certification_id가 있는 행(공유 콘텐츠)은 (user_id, chapter_id, certification_id)로 유일
CREATE UNIQUE INDEX IF NOT EXISTS chapter_stats_user_chapter_null_cert_uidx
  ON chapter_stats (user_id, chapter_id)
  WHERE certification_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chapter_stats_user_chapter_cert_uidx
  ON chapter_stats (user_id, chapter_id, certification_id)
  WHERE certification_id IS NOT NULL;

-- 4. 기존 데이터 백필
--    chapters -> courses 조인으로 courses.certification_id를 역추적해서 채움.
--    IIPA 콘텐츠는 courses.certification_id가 전부 Lv1(e52ea177)로 저장돼
--    있으므로 이 한 문장으로 "IIPA 기존 진도 = Lv1 귀속, Lv2는 비워둠(신규
--    취급)"이 자동으로 성립함 — Lv2를 가리키는 courses 행이 애초에 없기 때문.
--
--    타입 주의: chapter_stats.chapter_id는 text, chapters.id/courses.id/
--    courses.certification_id는 uuid (OpenAPI 스키마로 실측 확인). ch.id를
--    text로 캐스팅해서 비교 — uuid→text는 항상 안전하게 성공하는 반면
--    text→uuid는 값이 깨져 있으면 실패할 수 있어 이 방향을 선택함.
UPDATE chapter_stats cs
SET certification_id = c.certification_id
FROM chapters ch
JOIN courses c ON c.id = ch.course_id
WHERE cs.chapter_id = ch.id::text
  AND cs.certification_id IS NULL
  AND c.certification_id IS NOT NULL;

COMMIT;

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT certification_id, count(*) FROM chapter_stats GROUP BY certification_id;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'chapter_stats';
