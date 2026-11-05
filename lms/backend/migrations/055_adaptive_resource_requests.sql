-- Adaptive learning resource requests.
--
-- Flow: when a student scores low on an exam, the adaptive system flags the
-- weak concepts (concept_mastery). The student sees these as "recommended
-- concepts" and can REQUEST curated resources for them. Teachers receive a
-- notification, review the request in their portal, and PUSH vetted videos /
-- links back. Students then watch them from their Resources tab.
--
-- resource_requests : the student -> teacher request (with concept context)
-- student_resources  : resources a teacher pushed for a student (tied to a request)

CREATE TABLE IF NOT EXISTS resource_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL,
  textbook_id UUID,
  chapter_id UUID,
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  concept_title TEXT NOT NULL DEFAULT '',
  chapter_title TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  declined_reason TEXT NOT NULL DEFAULT '',
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS student_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES resource_requests(id) ON DELETE CASCADE,
  concept_id UUID,
  textbook_id UUID,
  chapter_id UUID,
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  concept_title TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  source_label TEXT NOT NULL DEFAULT '',
  thumbnail TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  channel_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  embed_url TEXT NOT NULL DEFAULT '',
  video_id TEXT NOT NULL DEFAULT '',
  pushed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resource_requests_student ON resource_requests(student_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_resource_requests_status ON resource_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_resources_student ON student_resources(student_id);

ALTER PUBLICATION supabase_realtime ADD TABLE resource_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE student_resources;

-- Row level security: enable but open for now so the backend (service role)
-- and realtime reads work; the backend layer enforces role-based access.
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_requests_all" ON resource_requests;
CREATE POLICY resource_requests_all ON resource_requests
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "student_resources_all" ON student_resources;
CREATE POLICY student_resources_all ON student_resources
  FOR ALL USING (true) WITH CHECK (true);
