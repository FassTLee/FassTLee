-- lesson_slide_logs.image_zoom_count — 코드베이스 동기화용 (프로덕션 DB엔 이미 적용됨)
-- 슬라이드(카드)별 이미지 확대(zoom) 탭 횟수. integer default 0.
-- checkbox_order_raw / checkbox_intervals_raw / checkbox_click_interval / checkbox_total 는
-- 기존 스키마에 이미 존재하므로 마이그레이션 불필요.
ALTER TABLE lesson_slide_logs
ADD COLUMN IF NOT EXISTS image_zoom_count integer DEFAULT 0;
