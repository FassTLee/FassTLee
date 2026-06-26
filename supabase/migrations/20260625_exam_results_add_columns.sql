ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS passed boolean;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS abandoned boolean DEFAULT false;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS time_remaining integer;
