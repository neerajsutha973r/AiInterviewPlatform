-- Additive only. Existing sessions deliberately receive no expiry backfill.
BEGIN;
ALTER TABLE users ADD COLUMN token_expires_at TIMESTAMPTZ;
COMMIT;
