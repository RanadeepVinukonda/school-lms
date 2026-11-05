-- 006_curriculum_planning.sql
-- Curriculum plans for teachers mapping chapters to calendar weeks

CREATE TABLE IF NOT EXISTS curriculum_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id),
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id),
  chapters JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_curriculum_plans_teacher ON curriculum_plans(teacher_id);
CREATE INDEX idx_curriculum_plans_school ON curriculum_plans(school_id);
