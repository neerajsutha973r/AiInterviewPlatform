-- Destructive rollback: authenticated traffic must be stopped first.
-- Deploy compatible code before removing the column. Never restore old tokens.
BEGIN;
UPDATE users SET token = NULL, token_expires_at = NULL;
ALTER TABLE users DROP COLUMN token_expires_at;
COMMIT;
