-- Secure RPC for users to mark tutorial as seen.
-- SECURITY DEFINER bypasses RLS so anon-key clients can update their own row.
CREATE OR REPLACE FUNCTION public.set_tutorial_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE users SET tutorial_seen = true WHERE id = auth.uid();
$$;

-- Grant execute to anon/authenticated so the frontend anon key can call it.
GRANT EXECUTE ON FUNCTION public.set_tutorial_seen() TO anon, authenticated;
