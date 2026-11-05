-- 003_curriculum.sql
-- Curriculum Intelligence

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  topic TEXT,
  concept TEXT,
  learning_objective TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publisher_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  publisher TEXT NOT NULL,
  textbook_title TEXT,
  page_start INT,
  page_end INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_curriculum_board ON curriculum_hierarchy(board_id);
CREATE INDEX idx_curriculum_grade_subject ON curriculum_hierarchy(grade, subject);

INSERT INTO boards (name, code) VALUES
  ('CBSE', 'CBSE'),
  ('ICSE', 'ICSE'),
  ('AP State Board', 'AP'),
  ('Telangana State Board', 'TS'),
  ('Cambridge IGCSE', 'CAMBRIDGE')
ON CONFLICT (code) DO NOTHING;
