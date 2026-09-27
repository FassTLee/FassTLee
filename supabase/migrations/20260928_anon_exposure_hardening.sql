-- 20260928: anon 키 노출 면 차단 (권한 변경 2건)
--
-- 적용 이력:
--   dev  2026-09-27~28 (KST)  오너가 Supabase SQL Editor에서 선적용, 검증 통과
--   prod 2026-09-27~28 (KST)  (서울 리전 신 prod) 선적용, 검증 통과
--
-- 배경: 2026-09-19 배포부터 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 브라우저 번들에 실린다.
-- anon 키는 공개값이므로 anon 에 열린 권한·정책은 곧 전체 공개다.
-- 2026-09-27~28 사전 실측에서 두 곳이 열려 있었다.
--
-- (1) v_learning_style_integrity
--   실측: relkind=v / security_invoker 미설정 / anon SELECT 가능 (dev·prod 동일)
--   뷰는 기본적으로 소유자 권한으로 실행되어 RLS를 거치지 않으므로
--   anon 키만으로 전 사용자의 user_id·유형·배정 값을 읽을 수 있었다.
--   앱 참조 0건. 조회는 SQL Editor 와 service_role 만 한다.
--   생성: 20260916_learning_style_seed_and_prescription.sql
--   주의: CREATE OR REPLACE VIEW 는 기존 뷰 옵션을 지운다.
--         이 뷰를 다시 만들 때는 security_invoker 옵션을 WITH 절에 함께 쓴다.
--
-- (2) exam_registrations
--   실측 (prod pg_policies, 대상 {public}):
--     "users can read own registration"   SELECT USING (true)
--     "users can insert own registration" INSERT WITH CHECK (true)
--   컬럼에 name·phone·email 이 있다. 앱 참조 0건 (oral_exam_registrations 와 별개 테이블).
--   두 정책은 00000000000000_baseline_schema.sql 에서 생성되며 이 파일이 제거한다.
--   정책 삭제 후 RLS 활성·정책 0개 = service_role 전용. 의도이며 누락이 아니다.
--   적용 시점 행 수: dev 0 / prod 0 — 실제로 노출된 개인정보는 없었다.
--
-- 멱등성: 모든 구문이 재실행 안전하다 (옵션 지정·권한 회수·조건부 정책 삭제).

BEGIN;
ALTER VIEW public.v_learning_style_integrity SET (security_invoker = true);
REVOKE ALL ON public.v_learning_style_integrity FROM PUBLIC, anon, authenticated;
COMMIT;

BEGIN;
DROP POLICY IF EXISTS "users can read own registration"   ON public.exam_registrations;
DROP POLICY IF EXISTS "users can insert own registration" ON public.exam_registrations;
REVOKE ALL ON public.exam_registrations FROM PUBLIC, anon, authenticated;
COMMIT;

-- 선적용 검증 결과 (dev·prod 동일):
--   v_learning_style_integrity : security_invoker=true / anon=false / authenticated=false / service_role=true
--   exam_registrations         : policy_count=0 / anon_select=false / anon_insert=false /
--                                service_role_select=true / rls_enabled=true / rows=0
