-- ================================================================
-- IIPA 단원(1~8) Lv1/Lv2 노출 매핑 (course_certifications)
--
-- 컬럼은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 실측 재확인함
-- (information_schema는 PostgREST에서 직접 조회 불가):
--   course_certifications.id                = uuid, PK, default gen_random_uuid()
--   course_certifications.course_id         = uuid, FK -> courses.id
--   course_certifications.certification_id  = uuid, FK -> certifications.id
--   course_certifications.created_at        = timestamptz, default now()
--   UNIQUE(course_id, certification_id) 제약 있음 (20260703 마이그레이션에서 생성)
--
-- 매핑 대상 (요청 기준):
--   해부학 기초                              -> Lv1만
--   골격계/관절/목체간근육/상지근육/하지근육  -> Lv1 + Lv2 둘 다
--   촉지 해부학, 자세분석과 평가              -> Lv2만 (courses 아직 미생성 —
--     현재 실행 시 0건 매칭되며, 단원 생성 후 이 파일의 3번 블록만
--     재실행하면 자동으로 매핑됨)
--
-- 주의: 20260703_course_certifications.sql 백필 로직이 courses.certification_id
-- = Lv1인 모든 course에 Lv2도 일괄 매핑해뒀기 때문에, 현재 '해부학 기초'에도
-- Lv2가 잘못 붙어 있음. 1번 블록에서 이를 제거함.
--
-- 실행: Supabase SQL Editor에서 직접 실행 (검토 후 진행 예정 — 초안)
-- ================================================================

BEGIN;

-- IIPA subject_id, 자격증 id
-- subject_id            = 7538c34d-5b36-4955-91fd-3f7fe4e7f244 (IIPA 필라테스 해부학)
-- certification_id Lv1  = e52ea177-15cd-4a92-b624-391e69c160cb
-- certification_id Lv2  = 5e130f49-0439-4f34-8585-a8d26f197e3e

-- 1. 해부학 기초: Lv1 전용으로 정정 (잘못 붙은 Lv2 매핑 제거)
DELETE FROM course_certifications
WHERE certification_id = '5e130f49-0439-4f34-8585-a8d26f197e3e'
  AND course_id = (
    SELECT id FROM courses
    WHERE subject_id = '7538c34d-5b36-4955-91fd-3f7fe4e7f244'
      AND title = '해부학 기초'
  );

-- 2. 골격계/관절/목체간근육/상지근육/하지근육: Lv1 + Lv2 둘 다 (이미 있으면 스킵)
INSERT INTO course_certifications (course_id, certification_id)
SELECT c.id, cert.id
FROM courses c
CROSS JOIN (
  VALUES
    ('e52ea177-15cd-4a92-b624-391e69c160cb'::uuid),
    ('5e130f49-0439-4f34-8585-a8d26f197e3e'::uuid)
) AS cert(id)
WHERE c.subject_id = '7538c34d-5b36-4955-91fd-3f7fe4e7f244'
  AND c.title IN ('골격계', '관절', '목/체간 근육', '상지 근육', '하지 근육')
ON CONFLICT (course_id, certification_id) DO NOTHING;

-- 3. 촉지 해부학, 자세분석과 평가: Lv2 전용
--    courses 미생성 상태라 현재는 0건 매칭 — 단원 생성 후 재실행하면 적용됨
INSERT INTO course_certifications (course_id, certification_id)
SELECT c.id, '5e130f49-0439-4f34-8585-a8d26f197e3e'::uuid
FROM courses c
WHERE c.subject_id = '7538c34d-5b36-4955-91fd-3f7fe4e7f244'
  AND c.title IN ('촉지 해부학', '자세분석과 평가')
ON CONFLICT (course_id, certification_id) DO NOTHING;

COMMIT;

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT c.title, cc.certification_id, cert.name
-- FROM course_certifications cc
-- JOIN courses c ON c.id = cc.course_id
-- JOIN certifications cert ON cert.id = cc.certification_id
-- WHERE c.subject_id = '7538c34d-5b36-4955-91fd-3f7fe4e7f244'
-- ORDER BY c.title, cert.name;
