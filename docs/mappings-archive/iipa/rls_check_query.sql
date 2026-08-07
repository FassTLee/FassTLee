-- ================================================================
-- course_certifications RLS/GRANT 조사용 조회 쿼리 (읽기 전용, 안전)
-- 결과를 그대로 공유해주시면 이를 기준으로 course_certifications에
-- 적용할 SQL을 작성하겠습니다.
-- ================================================================

-- 1. RLS 활성화 여부 비교
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'chapters', 'chapter_cards', 'course_certifications')
ORDER BY tablename;

-- 2. 기존 정책 확인 (courses/chapters/chapter_cards가 실제로 어떤 정책을 쓰는지,
--    course_certifications에는 정책이 있는지)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'chapters', 'chapter_cards', 'course_certifications')
ORDER BY tablename, policyname;

-- 3. 테이블 권한(GRANT) 확인 — anon/authenticated 롤에 SELECT 권한이
--    실제로 부여돼 있는지
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('courses', 'chapters', 'chapter_cards', 'course_certifications')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
