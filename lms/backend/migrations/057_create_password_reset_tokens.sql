-- Migration 057: Password reset tokens (Resend-based forgot/reset flow)
-- Stores a SHA-256 hash of each single-use reset token with expiry and use-flag.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: the table is only accessed through the backend service-role client.