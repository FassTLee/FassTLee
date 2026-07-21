-- 2026-07-21: 자격증 축 스키마 Phase 1 (additive only)
-- 영역(area)·급수(grade/grade_rank)·종목(sports)·시험종류(exam_type) 축 신설.
-- 콘텐츠 복제 관계 추적용 course_relations 신설.
-- subjects 자격증 전속화 및 user_certifications UUID 참조 전환을 위한
-- 병행 컬럼 추가(기존 컬럼 유지, 제거는 Phase 2).
-- ※ prod/dev 양쪽 모두 SQL Editor로 선행 적용 완료(2026-07-21).
--    재구축·재실행 대비용이며 전부 멱등 처리.

BEGIN;

-- ===== 구조 =====
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS area       text,
  ADD COLUMN IF NOT EXISTS grade      text,
  ADD COLUMN IF NOT EXISTS grade_rank int;

CREATE TABLE IF NOT EXISTS sports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  order_index int  NOT NULL DEFAULT 1,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exam_type text,
  ADD COLUMN IF NOT EXISTS sport_id  uuid REFERENCES sports(id);

CREATE TABLE IF NOT EXISTS course_relations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_course_id uuid NOT NULL REFERENCES courses(id),
  to_course_id   uuid NOT NULL REFERENCES courses(id),
  relation_type  text NOT NULL,
  synced         boolean NOT NULL DEFAULT false,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_course_id, to_course_id, relation_type),
  CHECK (from_course_id <> to_course_id)
);

ALTER TABLE user_certifications
  ADD COLUMN IF NOT EXISTS exam_types  text[],
  ADD COLUMN IF NOT EXISTS sport_id    uuid REFERENCES sports(id),
  ADD COLUMN IF NOT EXISTS subject_ids uuid[];

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS certification_id uuid REFERENCES certifications(id);

-- ===== RLS =====
ALTER TABLE sports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sports_public_read ON sports;
CREATE POLICY sports_public_read ON sports
  FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS course_relations_public_read ON course_relations;
CREATE POLICY course_relations_public_read ON course_relations
  FOR SELECT TO anon USING (true);

-- ===== 데이터 =====
INSERT INTO sports (name, slug, order_index)
VALUES ('보디빌딩', 'bodybuilding', 1)
ON CONFLICT (slug) DO NOTHING;

UPDATE certifications SET grade = level
WHERE grade IS NULL AND level IS NOT NULL;

UPDATE certifications SET grade_rank = 1
WHERE grade_rank IS NULL AND grade IN ('2급', 'lv1');

UPDATE certifications SET grade_rank = 2
WHERE grade_rank IS NULL AND grade IN ('1급', 'lv2');

UPDATE certifications SET area = '생활'
WHERE area IS NULL
  AND slug IN ('sport_instructor_lv1', 'sport_instructor_lv2');

UPDATE user_certifications
SET exam_types = CASE
      WHEN exam_type = 'practical' THEN ARRAY['practical', 'oral']
      WHEN exam_type = 'written'   THEN ARRAY['written']
      ELSE ARRAY[]::text[]
    END
WHERE exam_types IS NULL;

COMMIT;
