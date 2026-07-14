CREATE TABLE IF NOT EXISTS concept_progress (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  quiz_scores INTEGER[] DEFAULT '{}',
  quiz_attempts INTEGER DEFAULT 0,
  time_spent_minutes REAL DEFAULT 0.0,
  lesson_completed BOOLEAN DEFAULT false,
  video_completed BOOLEAN DEFAULT false,
  question_accuracy REAL DEFAULT 0.0,
  assignment_scores INTEGER[] DEFAULT '{}',
  mastery_percentage REAL DEFAULT 0.0,
  skill_level TEXT DEFAULT 'beginner',
  last_accessed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_progress_user ON concept_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_progress_concept ON concept_progress(concept_id);

ALTER TABLE concept_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own concept progress"
  ON concept_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own concept progress"
  ON concept_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own concept progress"
  ON concept_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own concept progress"
  ON concept_progress FOR DELETE
  USING (auth.uid() = user_id);
