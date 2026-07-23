-- 20260723_remove_shared_subject_mapping.sql
-- 배경: subject '운동생리학'(6b4d0f46)이 국가/민간 두 자격증에 공유 매핑되어
--       정본 course_certifications(4건)와 subject 경로(5건)가 불일치했음.
--       국가 콘텐츠(42챕터)가 민간 자격증에 노출될 수 있는 구조.
-- 조치: 민간(40ac89d8, 운동건강관리사) 측 매핑 1건 삭제.
-- 주의: 이 두 자격증은 name과 slug가 교차 배정되어 있어
--       이름·slug가 아닌 UUID로만 지시함.
BEGIN;
DELETE FROM certification_subjects
WHERE id = '6e4d62c7-e0aa-4be8-bc4e-1110e3201e13';
COMMIT;
