-- ================================================================
-- chapter_stats: PERMISSIVE RLS 정책 6건 삭제
--
-- · 2026-08-07 dev·prod 양측 SQL Editor로 선적용 완료
-- · 검증: rls_enabled=true, policy_count=0 (양측)
-- · 정책 0개는 의도이며 누락이 아니다. 접근은 service_role 전용.
--   이 앱은 Supabase Auth를 쓰지 않아 auth.uid()가 항상 NULL이므로
--   authenticated 정책이 성립하지 않는다.
-- · 선행 작업: 커밋 39b5315 (anon 직접 조회를 서버 라우트로 이관)
--
-- DROP POLICY IF EXISTS 이므로 재실행해도 안전하다.
-- ================================================================

BEGIN;
DROP POLICY IF EXISTS "allow_select_chapter_stats" ON public.chapter_stats;
DROP POLICY IF EXISTS "allow_insert_chapter_stats" ON public.chapter_stats;
DROP POLICY IF EXISTS "allow_update_chapter_stats" ON public.chapter_stats;
DROP POLICY IF EXISTS "users can read own stats"   ON public.chapter_stats;
DROP POLICY IF EXISTS "users can insert own stats" ON public.chapter_stats;
DROP POLICY IF EXISTS "users can update own stats" ON public.chapter_stats;
COMMIT;
