-- profiles 테이블에 certification_id 컬럼 추가
-- certifications.id (UUID) 를 직접 참조; 기존 cert_type 컬럼은 호환성 유지
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS certification_id UUID
    REFERENCES certifications(id)
    ON DELETE SET NULL;

-- 인덱스 (certifications 기준 프로필 조회용)
CREATE INDEX IF NOT EXISTS idx_profiles_certification_id
  ON profiles (certification_id);

COMMENT ON COLUMN profiles.certification_id IS
  'certifications.id 직접 참조. cert_type(문자열)과 병행 사용 가능.';
