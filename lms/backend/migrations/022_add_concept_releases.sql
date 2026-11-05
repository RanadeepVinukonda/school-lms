CREATE TABLE IF NOT EXISTS concept_releases (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  textbook_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  question_bank_released BOOLEAN NOT NULL DEFAULT false,
  assignments_released BOOLEAN NOT NULL DEFAULT false,
  mind_map_released BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_releases_class ON concept_releases(class_id);
CREATE INDEX IF NOT EXISTS idx_concept_releases_textbook ON concept_releases(textbook_id);
CREATE INDEX IF NOT EXISTS idx_concept_releases_concept ON concept_releases(concept_id);
