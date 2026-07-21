-- 2026-07-20: certifications.slug 중복 해소 및 UNIQUE 제약 추가
-- deprecated 2급 생활스포츠지도사(3cd928fe-f820-4335-adb7-25fd904c898c)가
-- 활성본(cc68cb0c-6c32-4b14-a7d7-e422a5bc9954)과 동일 slug를 공유해
-- select-subject의 .single()에서 PGRST116 발생 → slug 개명 후 UNIQUE 부여
-- ※ prod/dev 양쪽 모두 SQL Editor로 선행 적용 완료(2026-07-20).
--    본 파일은 재구축·재실행 대비용이며, 재실행해도 안전하도록 멱등 처리.

UPDATE certifications
SET slug = 'sport_instructor_lv2_deprecated'
WHERE id = '3cd928fe-f820-4335-adb7-25fd904c898c'
  AND slug = 'sport_instructor_lv2';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'certifications'::regclass
      AND conname = 'certifications_slug_unique'
  ) THEN
    ALTER TABLE certifications
    ADD CONSTRAINT certifications_slug_unique UNIQUE (slug);
  END IF;
END $$;
