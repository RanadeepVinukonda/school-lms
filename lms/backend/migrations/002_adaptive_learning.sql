-- 002_adaptive_learning.sql
-- Adaptive Learning Engine

CREATE TABLE IF NOT EXISTS concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  accuracy DECIMAL DEFAULT 0,
  attempt_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  mastery_score DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, concept_id)
);

CREATE INDEX idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX idx_concept_mastery_school ON concept_mastery(school_id);
