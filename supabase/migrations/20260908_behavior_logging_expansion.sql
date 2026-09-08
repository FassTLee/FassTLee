-- 2026-09-08 dev 선적용 → prod 적용 완료. 이 파일은 선적용 상태 고정용.
BEGIN;

ALTER TABLE public.lesson_slide_logs
  ADD COLUMN IF NOT EXISTS advance_trigger text,
  ADD COLUMN IF NOT EXISTS scroll_depth double precision,
  ADD COLUMN IF NOT EXISTS interaction_raw jsonb;

ALTER TABLE public.chapter_cards
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_caption text,
  ADD COLUMN IF NOT EXISTS video_source text;

ALTER TABLE public.quiz_performance_logs
  ALTER COLUMN wrong_answer_vulnerability DROP DEFAULT;

COMMIT;
