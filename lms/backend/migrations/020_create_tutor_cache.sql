-- Universal Q&A cache for AI tutor — shared across all students
-- Tier 1: direct concept answer (no LLM)
-- Tier 2: cached LLM responses from past questions

CREATE TABLE IF NOT EXISTS tutor_response_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_embedding VECTOR(384),
  reply TEXT NOT NULL,
  grounded_in TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  access_count INTEGER DEFAULT 1
);

-- ponytail: no vector index yet — cache is small (thousands of rows), full scan is fine
-- add ivfflat or hnsw when cache exceeds 10k rows

-- Search cache for semantically similar past questions
CREATE OR REPLACE FUNCTION search_tutor_cache(
  query_embedding VECTOR(384),
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
         1 - (tc.query_embedding <=> query_embedding) AS similarity
  FROM tutor_response_cache tc
  WHERE tc.query_embedding IS NOT NULL
    AND 1 - (tc.query_embedding <=> query_embedding) > match_threshold
  ORDER BY tc.query_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Increment access count and update timestamp
CREATE OR REPLACE FUNCTION touch_cache_entry(cache_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tutor_response_cache
  SET access_count = access_count + 1, last_accessed_at = now()
  WHERE id = cache_id;
END;
$$;
