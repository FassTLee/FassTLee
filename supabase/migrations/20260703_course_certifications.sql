-- ================================================================
-- course_certifications: course ↔ certification 다대다 매핑 테이블
--
-- 배경: courses.certification_id(uuid, 단일값)만으로는 한 course가
-- 여러 자격증(예: IIPA Lv1 + Lv2)에 동시에 속하는 걸 표현할 수 없음.
-- 기존 certification_subjects(subject_id ↔ certification_id 다대다)와
-- 완전히 동일한 패턴을 course 레벨에도 그대로 적용.
--
-- courses.certification_id 컬럼은 그대로 둠 — exam-questions API,
-- lesson 페이지 헤더 표시 등 기존 코드가 단일값으로 참조 중이라
-- 건드리지 않는 순수 추가(additive) 변경.
--
-- 컬럼 타입은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 실측 확인함
-- (information_schema는 PostgREST에서 직접 조회 불가):
--   courses.id            = uuid   (courses.title은 text — name 아님)
--   certifications.id     = uuid   (certifications.name은 text — title 아님)
--   certification_subjects.certification_id/subject_id = 둘 다 uuid
--     (기존에 이미 있는 동일 패턴 테이블 — 그대로 참고함)
--
-- 실행: Supabase SQL Editor에서 전체 실행 (직접 실행 필요 —
-- Supabase JS 클라이언트로는 DDL 실행 불가)
-- ================================================================

BEGIN;

-- 1. course_certifications 테이블 생성
--    course_id / certification_id 둘 다 uuid — 실측 확인된 courses.id,
--    certifications.id 타입과 정확히 일치시킴
CREATE TABLE IF NOT EXISTS course_certifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,        -- courses.id: uuid
  certification_id  uuid NOT NULL REFERENCES certifications(id) ON DELETE CASCADE, -- certifications.id: uuid
  created_at        timestamptz DEFAULT now(),
  UNIQUE (course_id, certification_id)
);

CREATE INDEX IF NOT EXISTS idx_course_certifications_course
  ON course_certifications (course_id);
CREATE INDEX IF NOT EXISTS idx_course_certifications_cert
  ON course_certifications (certification_id);

-- 2. 백필: 기존 courses.certification_id(uuid, 단일값) → 매핑 테이블로 복사
--    기존 course는 전부 자격증 1개 전용이었으므로 그대로 1:1 매핑 유지됨
INSERT INTO course_certifications (course_id, certification_id)
SELECT id, certification_id
FROM courses
WHERE certification_id IS NOT NULL
ON CONFLICT (course_id, certification_id) DO NOTHING;

-- 3. IIPA courses를 Lv1+Lv2 공통으로 지정
--    (courses.certification_id는 전부 Lv1로 저장돼 있으므로, 2번 백필로
--     이미 Lv1 매핑은 들어감 — 여기서 Lv2 매핑만 추가)
--    e52ea177-15cd-4a92-b624-391e69c160cb = IIPA Lv1 (certifications.id)
--    5e130f49-0439-4f34-8585-a8d26f197e3e = IIPA Lv2 (certifications.id)
INSERT INTO course_certifications (course_id, certification_id)
SELECT id, '5e130f49-0439-4f34-8585-a8d26f197e3e'
FROM courses
WHERE certification_id = 'e52ea177-15cd-4a92-b624-391e69c160cb'
ON CONFLICT (course_id, certification_id) DO NOTHING;

COMMIT;

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT c.title, cc.certification_id, cert.name
-- FROM course_certifications cc
-- JOIN courses c ON c.id = cc.course_id
-- JOIN certifications cert ON cert.id = cc.certification_id
-- WHERE c.subject_id = '7538c34d-5b36-4955-91fd-3f7fe4e7f244'  -- IIPA 필라테스 해부학
-- ORDER BY c.title, cert.name;
-- (예상 결과: IIPA courses 3개 × 2행씩 = 6행, Lv1/Lv2 각각)
