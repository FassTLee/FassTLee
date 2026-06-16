-- chapter_session_logs exit_point CHECK 제약 조건 확장
-- 기존: slide, miniquiz, test, completed
-- 변경: 실제 코드에서 사용하는 값으로 통일
ALTER TABLE chapter_session_logs
DROP CONSTRAINT chapter_session_logs_exit_point_check;

ALTER TABLE chapter_session_logs
ADD CONSTRAINT chapter_session_logs_exit_point_check
CHECK (exit_point IN (
  'lesson_complete',
  'user_exit',
  'unload',
  'test_submit',
  'mini_quiz',
  'slide'
));
