-- ================================================================
-- "2급 생활스포츠지도사" 중복 certification row 정리
--
-- 배경: certifications 테이블에 동일 name/slug("2급 생활스포츠지도사" /
-- "sport_instructor_lv2")를 가진 row가 2개 존재. created_at까지 밀리초
-- 단위로 동일해 단일 시딩 스크립트의 중복 실행으로 추정됨.
--
-- 조사 결과 (PM 확인 완료):
--   A = cc68cb0c-6c32-4b14-a7d7-e422a5bc9954 — 실제 사용 중인 row
--       (코드에 하드코딩됨: src/app/trainer/dashboard/_components/
--        DashboardModals.tsx:499, chapter_stats 822건/courses 8건/
--        course_certifications 8건 등 실데이터 보유)
--   B = 3cd928fe-f820-4335-adb7-25fd904c898c — 중복 row
--       (certification_subjects 9건이 A와 완전히 동일 = 중복 시딩 증거)
--
-- 컬럼은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 재확인함
-- (information_schema는 PostgREST에서 직접 조회 불가):
--   exam_schedules.certification_id            = uuid, FK -> certifications.id
--   oral_exam_registrations.certification_id    = uuid, FK -> certifications.id
--   certifications.is_active                    = boolean, default true
--   certifications.name                         = text
--
-- exam_schedules(B) 3건: config성 데이터(user_id 컬럼 자체가 없음).
--   실제로 이 테이블을 읽는 코드(/api/v1/oral-exam/schedule)는
--   certification_id로 필터링하지 않고 존재하지 않는 컬럼(exam_name)을
--   select하고 있어 사실상 죽은 코드 — 그래도 데이터 일관성을 위해 A로 이관.
-- oral_exam_registrations(B) 1건: user_id=4b3089c3-...(실사용자, PM 확인).
--   같은 유저가 A 기준으로 이미 7건 보유 중이며 week_number/slot_number가
--   겹치지 않아 이관 시 충돌 없음(사전 확인 완료).
--
-- 실행: PM 검토 후 Supabase SQL Editor에서 직접 실행
-- ================================================================

BEGIN;

-- 1. exam_schedules: B → A
UPDATE exam_schedules
SET certification_id = 'cc68cb0c-6c32-4b14-a7d7-e422a5bc9954'
WHERE certification_id = '3cd928fe-f820-4335-adb7-25fd904c898c';

-- 2. oral_exam_registrations: B → A
UPDATE oral_exam_registrations
SET certification_id = 'cc68cb0c-6c32-4b14-a7d7-e422a5bc9954'
WHERE certification_id = '3cd928fe-f820-4335-adb7-25fd904c898c';

-- 3. B row는 삭제하지 않고 비활성화 + 이름에 deprecated 표시만 추가
--    (요청하신 안 그대로 — 삭제는 이번엔 하지 않음)
UPDATE certifications
SET name = '2급 생활스포츠지도사 (deprecated)',
    is_active = false
WHERE id = '3cd928fe-f820-4335-adb7-25fd904c898c';

COMMIT;

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT * FROM exam_schedules WHERE certification_id = '3cd928fe-f820-4335-adb7-25fd904c898c'; -- 0건이어야 정상
-- SELECT * FROM oral_exam_registrations WHERE certification_id = '3cd928fe-f820-4335-adb7-25fd904c898c'; -- 0건이어야 정상
-- SELECT id, name, is_active FROM certifications WHERE id IN ('cc68cb0c-6c32-4b14-a7d7-e422a5bc9954', '3cd928fe-f820-4335-adb7-25fd904c898c');
