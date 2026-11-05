-- Add keywords column to concept_notes for tag-based filtering
ALTER TABLE concept_notes ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT '';

-- Vector search function for concept_notes (used by AI tutor context grounding)
CREATE OR REPLACE FUNCTION pgvector_search_notes(
  query_embedding VECTOR(384),
  match_threshold REAL DEFAULT 0.6,
  match_count INTEGER DEFAULT 3
)
RETURNS TABLE(
  id UUID,
  concept_id UUID,
  textbook_id UUID,
  chapter_id UUID,
  title TEXT,
  summary TEXT,
  notes TEXT,
  key_points TEXT,
  formulas TEXT,
  examples TEXT,
  learning_objectives TEXT,
  keywords TEXT,
  similarity REAL
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT cn.id, cn.concept_id, cn.textbook_id, cn.chapter_id,
         c.title, cn.summary, cn.notes, cn.key_points,
         cn.formulas, cn.examples, cn.learning_objectives, cn.keywords,
         1 - (cn.embedding <=> query_embedding)::REAL AS similarity
  FROM concept_notes cn
  JOIN concepts c ON c.id = cn.concept_id
  WHERE cn.embedding IS NOT NULL
    AND 1 - (cn.embedding <=> query_embedding) > match_threshold
  ORDER BY cn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
