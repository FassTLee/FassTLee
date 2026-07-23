-- 20260722_courses_slug.sql
-- courses.slug 신설 + global UNIQUE + 20건 값 채우기
-- 스키마 근거: information_schema 실측 — courses에 slug 컬럼 없음 확인
-- 대상: 건강운동관리사(국가)8 + IIPA(Lv1전속1·공유5·Lv2전속2) + 운동건강관리사(민간)4 = 20건
-- 2급(cc68cb0c) 8건은 재편 트랙 동결 → slug NULL 유지
-- prod 선행 적용 완료(2026-07-22): filled=20, null=8(2급), UNIQUE 확인
-- dev: courses 1건뿐이라 값 미반영, DDL·제약만 적용됨

BEGIN;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug text;

UPDATE courses SET slug = 'skeletal-system'       WHERE id = '798c82f9-00f0-4345-aed8-13e7ca918dcc' AND slug IS NULL;
UPDATE courses SET slug = 'joints'                WHERE id = '0b15015a-28a1-4e62-a7d2-64261e7b9821' AND slug IS NULL;
UPDATE courses SET slug = 'neck-trunk-muscles'    WHERE id = '1cc31dcd-6eeb-434d-9697-d9ab723e5f4f' AND slug IS NULL;
UPDATE courses SET slug = 'upper-limb-muscles'    WHERE id = '113a48d4-3843-4add-b43a-fec278d0dd27' AND slug IS NULL;
UPDATE courses SET slug = 'lower-limb-muscles'    WHERE id = '2f4e2cf8-54a0-4763-9ad4-4c636ec4a8bd' AND slug IS NULL;
UPDATE courses SET slug = 'anatomy-basics'        WHERE id = 'aa4aa3a2-dbf0-4dc0-bc41-a6764440e2b1' AND slug IS NULL;
UPDATE courses SET slug = 'palpation-anatomy'     WHERE id = '687266df-fb6f-47db-995e-cff6980130f9' AND slug IS NULL;
UPDATE courses SET slug = 'postural-analysis'     WHERE id = '9cb29a44-d7ee-434e-9c52-4c71efd49926' AND slug IS NULL;
UPDATE courses SET slug = 'exercise-physiology'       WHERE id = 'c66591ba-8085-4d66-9a8e-bd6728bbc58b' AND slug IS NULL;
UPDATE courses SET slug = 'sport-psychology'          WHERE id = '92f36a3a-6ea3-4753-b1ff-360a3db5c245' AND slug IS NULL;
UPDATE courses SET slug = 'functional-anatomy'        WHERE id = '07b01337-b77e-4073-bde5-ca7d9a485b61' AND slug IS NULL;
UPDATE courses SET slug = 'pathophysiology'           WHERE id = 'cc3ae50d-3dda-4a4d-9aaf-1b0e83907ce6' AND slug IS NULL;
UPDATE courses SET slug = 'health-fitness-assessment' WHERE id = '7dec5e5f-35fa-406c-97db-723eb0d84fdf' AND slug IS NULL;
UPDATE courses SET slug = 'exercise-stress-testing'   WHERE id = '61c77ae0-3d4c-4e68-b3e6-31a0bacf13aa' AND slug IS NULL;
UPDATE courses SET slug = 'exercise-prescription'     WHERE id = '47b3aca5-1c9a-4543-82ef-bba905d2bf0f' AND slug IS NULL;
UPDATE courses SET slug = 'sports-injury'             WHERE id = '12f7e736-17df-4630-983f-af991ef45506' AND slug IS NULL;
UPDATE courses SET slug = 'health-fitness-basics'         WHERE id = '5db16c71-6e49-4a8b-a3ff-388dd1ec2c59' AND slug IS NULL;
UPDATE courses SET slug = 'health-fitness-management'     WHERE id = '079b9a26-9203-4a25-99e3-fd35fd40bb09' AND slug IS NULL;
UPDATE courses SET slug = 'exercise-prescription-applied' WHERE id = '7f6541de-0312-4b52-9475-0cc63b99fa9d' AND slug IS NULL;
UPDATE courses SET slug = 'special-population-exercise'   WHERE id = 'a946fb0e-3376-42b5-b7bc-c682ec1a3f3e' AND slug IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_slug_key') THEN
    ALTER TABLE courses ADD CONSTRAINT courses_slug_key UNIQUE (slug);
  END IF;
END $$;

COMMIT;
