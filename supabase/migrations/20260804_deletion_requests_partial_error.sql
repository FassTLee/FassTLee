-- deletion_requests.intake_result에 partial_error 추가
--
-- 적용 이력: 2026-08-04 오너가 Supabase SQL Editor에서 dev·prod 양측에 선적용.
--            양측 pg_get_constraintdef로 4개 값 포함 확인.
--
-- 대상: /api/v1/user/delete route.ts, 자식 테이블 삭제 중 23503 이외 에러로
--       500을 반환하는 경로. 이 시점에 일부 자식 행은 이미 삭제되었고
--       profiles는 남아 있어 정합성이 깨진 잔여 상태가 된다.
--       소명 필요성이 가장 높은 경우다.
--
-- CHECK 제약은 ALTER로 값을 추가할 수 없어 DROP 후 재생성한다.
-- 20260804_add_deletion_requests.sql보다 뒤에 실행되어야 한다(파일명 정렬로 보장).

BEGIN;

ALTER TABLE public.deletion_requests
  DROP CONSTRAINT IF EXISTS deletion_requests_intake_result_check;

ALTER TABLE public.deletion_requests
  ADD CONSTRAINT deletion_requests_intake_result_check
  CHECK (intake_result IN ('deleted','fk_blocked','not_found','partial_error'));

COMMIT;