-- Fix ambiguous column reference: parameter name clashed with table column name
DROP FUNCTION IF EXISTS search_tutor_cache(vector, real, integer);

CREATE FUNCTION search_tutor_cache(
  p_query_embedding VECTOR(384),
  match_threshold REAL DEFAULT 0.95,
  match_count INTEGER DEFAULT 1
)
RETURNS TABLE(
  id UUID,
  query_text TEXT,
  reply TEXT,
  grounded_in TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT tc.id, tc.query_text, tc.reply, tc.grounded_in,
         1 - (tc.query_embedding <=> p_query_embedding) AS similarity
  FROM tutor_response_cache tc
  WHERE tc.query_embedding IS NOT NULL
    AND 1 - (tc.query_embedding <=> p_query_embedding) > match_threshold
  ORDER BY tc.query_embedding <=> p_query_embedding
  LIMIT match_count;
END;
$$;
