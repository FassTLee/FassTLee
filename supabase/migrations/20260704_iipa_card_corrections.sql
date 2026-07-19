-- ================================================================
-- IIPA 필라테스 해부학 카드 정정 (chapter_cards)
--
-- 컬럼은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 재확인함
-- (information_schema는 PostgREST에서 직접 조회 불가):
--   chapter_cards.id           = uuid, PK
--   chapter_cards.explanation  = text
--   chapter_cards.key_points   = jsonb (문자열 배열)
--
-- explanation은 REPLACE()로 부분 문자열만 치환, key_points는
-- jsonb_array_elements_text + jsonb_agg(REPLACE(...))로 배열의 각
-- 원소 안에서 동일한 부분 문자열만 치환 (다른 필드/다른 줄은 불변경).
--
-- ⚠️ 원본 PDF(docs/source-pdf/IIPA/IPPA 해부학 이론교육 교재.pdf) 대조 결과:
--   - item 1(극하근): 원본 p.124 자체가 소원근 항목을 복사하며 생긴 저작 오류로
--     PM 확인함 — 근거: IIPA 기출문제 1차 Q5 보기에 "Infraspinatus, Shoulder
--     External rotation"만 명시되어 실제 시험 기준과 일치. 교재보다 기출문제
--     기준을 따르기로 확정.
--   - item 2(반막양근), item 3(사각근)은 원본과 대조해 반영 근거 확인함.
--
-- 실행: PM 검토 후 Supabase SQL Editor에서 직접 실행
-- ================================================================

BEGIN;

-- 1. 극하근(Infraspinatus) 작용: "견관절 신전, 외회전(Extension, External rotation)"
--    -> "견관절 외회전(External rotation)" (한글·영문 병기 모두 정정)
-- id = 621e62b2-6981-4b6e-b42b-86973fa22ccc
UPDATE chapter_cards
SET explanation = replace(explanation, '견관절 신전, 외회전(Extension, External rotation)', '견관절 외회전(External rotation)'),
    key_points = (
      SELECT jsonb_agg(replace(elem, '견관절 신전, 외회전(Extension, External rotation)', '견관절 외회전(External rotation)'))
      FROM jsonb_array_elements_text(key_points) AS elem
    )
WHERE id = '621e62b2-6981-4b6e-b42b-86973fa22ccc';

-- 2. 반막양근(Semimembranosus) 정지: "경골 내측상부(치골근선)" -> "경골 내측과 후면"
--    원본 p.154 영문 표기(Medial condyle of tibia)와 일치시킴 —
--    원본 Korean "치골근선"은 원본 자체의 오기로 확인됨
-- id = f7a038a8-f1ba-43cc-90fd-7c915ce0fdd1
UPDATE chapter_cards
SET explanation = replace(explanation, '경골 내측상부(치골근선)', '경골 내측과 후면'),
    key_points = (
      SELECT jsonb_agg(replace(elem, '경골 내측상부(치골근선)', '경골 내측과 후면'))
      FROM jsonb_array_elements_text(key_points) AS elem
    )
WHERE id = 'f7a038a8-f1ba-43cc-90fd-7c915ce0fdd1';

-- 3. 사각근(Scalene) 작용: "외측굴곡(Lateral flexion)" 뒤에 ", 회전" 추가
--    (요청하신 "목의 굴곡, 외측굴곡" 문자열은 원본에 영문 병기가 끼어 있어
--     그대로는 매칭되지 않음 — "외측굴곡(Lateral flexion)" 뒤에 붙이는
--     방식으로 동일한 의도를 반영. 원본 p.102 영문에 "Rotation" 명시 확인함)
-- id = 0b5ef135-9f47-47d1-bb7c-4d14f3f55a6b
UPDATE chapter_cards
SET explanation = replace(explanation, '외측굴곡(Lateral flexion)', '외측굴곡(Lateral flexion), 회전'),
    key_points = (
      SELECT jsonb_agg(replace(elem, '외측굴곡(Lateral flexion)', '외측굴곡(Lateral flexion), 회전'))
      FROM jsonb_array_elements_text(key_points) AS elem
    )
WHERE id = '0b5ef135-9f47-47d1-bb7c-4d14f3f55a6b';

COMMIT;

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT id, explanation, key_points FROM chapter_cards
-- WHERE id IN ('621e62b2-6981-4b6e-b42b-86973fa22ccc', 'f7a038a8-f1ba-43cc-90fd-7c915ce0fdd1', '0b5ef135-9f47-47d1-bb7c-4d14f3f55a6b');
