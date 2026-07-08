-- Migration 012: Update concept_releases schema for progress tracking and visibility controls
ALTER TABLE concept_releases
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_released BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lecture_released BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_released BOOLEAN NOT NULL DEFAULT false;
