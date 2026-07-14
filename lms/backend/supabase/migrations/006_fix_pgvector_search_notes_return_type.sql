-- Fix pgvector_search_notes: similarity column type mismatch (REAL vs double precision)
-- The <=> operator returns double precision, so matching the return type to it.
DROP FUNCTION IF EXISTS pgvector_search_notes(vector, real, integer);
CREATE FUNCTION pgvector_search_notes(
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
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT cn.id, cn.concept_id, cn.textbook_id, cn.chapter_id,
         c.title, cn.summary, cn.notes, cn.key_points,
         cn.formulas, cn.examples, cn.learning_objectives, cn.keywords,
         1 - (cn.embedding <=> query_embedding) AS similarity
  FROM concept_notes cn
  JOIN concepts c ON c.id = cn.concept_id
  WHERE cn.embedding IS NOT NULL
    AND 1 - (cn.embedding <=> query_embedding) > match_threshold
  ORDER BY cn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
