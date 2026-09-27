-- 20260924: Storage 이전에 따른 이미지 URL 재작성 (데이터 변경)
--
-- 적용 이력:
--   prod 2026-09-24  (서울 리전 신 prod) 백업 테이블 생성 후 백업값 기준으로 선적용, 검증 통과
--   dev  2026-09-24  chapter_cards 9행 선적용, 검증 통과
--
-- 배경: 2026-09 리전 이전은 DB 덤프·복원이었고 Storage 파일은 옮겨지지 않았다.
--   이미지 URL이 구 prod 호스트를 가리켜, 구 prod 일시정지 후 이미지가 표시되지 않았다.
--   content-images 버킷 416개 객체를 신 prod 로 복사하고 sha256 전수 일치를 확인했다 (CC-46).
--
-- 변경:
--   (1) 호스트 교체 (구 prod → 신 prod)
--       prod: chapter_cards.image_url 246 / chapters.image_url 26 / chapters.content_json 34
--       dev : chapter_cards.image_url 9
--   (2) 경로 교정 (slides 하위 lv2 폴더 → _2 폴더)
--       prod: chapters.image_url 26 / chapters.content_json 34
--       lv2 폴더는 버킷에 존재한 적이 없다 (구 호스트에서도 400).
--       업로드 경로는 scripts/upload-slides.js 의 slides/sport_instructor_2/practical 이다.
--       lv2 경로는 저장소 밖에서 자격증 slug 로 조립된 것으로 판단한다.
--       표본 확인: 「도핑 규정 1」 → slide-051 = "도핑규정 & 응급처치" 간지 (주제 일치)
--
-- 참고: chapters.image_url·content_json 은 2026-09-24 현재 화면에 렌더되지 않는다.
--       슬라이드 번호의 정확성(간지·본문 구분)은 챕터 단위 미디어를 렌더할 때 따로 검증한다.
--
-- prod 백업 테이블: bak_20260924_chapter_cards_image_url (246행), bak_20260924_chapters_media (34행)
--   RLS 활성·정책 0개, anon·authenticated 권한 회수
--
-- 멱등성: 대상 조건이 치환 전 문자열이므로 적용 후 재실행하면 갱신되는 행이 없다.
-- 이 파일은 현재값 기준으로 작성했다. prod 선적용은 백업값 기준으로 했다.

BEGIN;
UPDATE public.chapter_cards
SET image_url = replace(image_url,
                        'sbketzgadjvzedbayesc.supabase.co',
                        'idawmwkcpkwomnetyccz.supabase.co')
WHERE image_url LIKE '%sbketzgadjvzedbayesc.supabase.co%';

UPDATE public.chapters
SET image_url = replace(replace(image_url,
                        'sbketzgadjvzedbayesc.supabase.co',
                        'idawmwkcpkwomnetyccz.supabase.co'),
                        '/slides/sport_instructor_lv2/', '/slides/sport_instructor_2/')
WHERE image_url LIKE '%sbketzgadjvzedbayesc.supabase.co%'
   OR image_url LIKE '%/slides/sport_instructor_lv2/%';

UPDATE public.chapters
SET content_json = replace(replace(content_json::text,
                           'sbketzgadjvzedbayesc.supabase.co',
                           'idawmwkcpkwomnetyccz.supabase.co'),
                           '/slides/sport_instructor_lv2/', '/slides/sport_instructor_2/')::jsonb
WHERE content_json::text LIKE '%sbketzgadjvzedbayesc.supabase.co%'
   OR content_json::text LIKE '%/slides/sport_instructor_lv2/%';
COMMIT;

-- 선적용 검증 결과 (prod):
--   구호스트 잔존 0 / lv2 경로 잔존 0 / 신호스트 246·26·34
--   역치환 후 백업 대조 불일치: chapter_cards 0 / chapters 0
--   화면: 「견갑골 근육」 레슨 카드 이미지 표시 확인
-- 선적용 검증 결과 (dev): 구호스트 0 / 신호스트 9
