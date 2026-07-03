-- ================================================================
-- user_wrong_answers: 구술시험(oral-exam) 오답 기록 테이블
--
-- 배경: src/app/api/v1/oral-exam/submit/route.ts 가 오답 시 이 테이블에
-- upsert를 시도하고 있었으나 테이블이 존재하지 않아 계속 실패 중이었음
-- (기존에는 try/catch로 실패를 무시 — 이번에 해당 로직도 제거함).
--
-- 기존에 정상 동작 중인 wrong_answers 테이블 구조를 참고해 일관된
-- 형태로 설계했으되, oral-exam/submit 코드가 실제로 upsert하려는
-- 컬럼(selected_index/correct_index/wrong_count/last_wrong_at)에 맞춤.
--
-- 컬럼 타입은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 실측 확인함
-- (information_schema는 PostgREST에서 직접 조회 불가):
--   wrong_answers.user_id       = uuid (profiles.id FK 선언되어 있음)
--   wrong_answers.chapter_id    = uuid (FK 선언 없음 — 그대로 따름)
--   wrong_answers.question_id   = uuid (FK 선언 없음 — 그대로 따름)
--   wrong_answers.created_at    = timestamptz, default now()
--   profiles.id                 = uuid
--   chapters.id                 = uuid
--   chapter_cards.id            = uuid
--   chapter_cards.chapter_id    = uuid (chapters.id FK)
--   chapter_cards.answer_index  = jsonb — route.ts에서 answer_index[0]을
--                                  읽어 정수(integer)로 correct_index에 저장
--
-- 실행: Supabase SQL Editor에서 전체 실행 (직접 실행 필요 —
-- Supabase JS 클라이언트로는 DDL 실행 불가)
-- ================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS user_wrong_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- profiles.id: uuid (wrong_answers.user_id와 동일하게 FK 선언)
  question_id     uuid NOT NULL,                                           -- chapter_cards.id: uuid (wrong_answers.question_id처럼 FK 미선언)
  chapter_id      uuid,                                                    -- chapter_cards.chapter_id: uuid, nullable (route.ts: q.chapter_id ?? null)
  selected_index  integer NOT NULL,                                        -- route.ts: body.selectedIndex (number)
  correct_index   integer,                                                 -- route.ts: q.answer_index?.[0] (jsonb 배열의 첫 값, number)
  wrong_count     integer NOT NULL DEFAULT 1,                              -- route.ts: 현재 항상 1로 upsert (증가 로직 없음 — 기존 코드 그대로)
  last_wrong_at   timestamptz NOT NULL DEFAULT now(),                      -- route.ts: new Date().toISOString()
  created_at      timestamptz DEFAULT now(),                               -- wrong_answers와 동일한 관례
  UNIQUE (user_id, question_id)  -- route.ts의 upsert(..., { onConflict: 'user_id,question_id' })가 요구하는 유니크 제약
);

CREATE INDEX IF NOT EXISTS idx_user_wrong_answers_user ON user_wrong_answers (user_id);
CREATE INDEX IF NOT EXISTS idx_user_wrong_answers_chapter ON user_wrong_answers (chapter_id);

COMMIT;
