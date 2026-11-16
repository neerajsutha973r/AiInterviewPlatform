# Session expiry migration 001

These files are prepared instructions only. No database operation has been run.
Live database, deployment and rollback actions require separate approval.

## Required schema before starting the updated backend

Existing installations must have `users.token_expires_at TIMESTAMPTZ` before
running this backend. After approval, apply `001_add_token_expires_at.up.sql`
once using the operator's approved database tooling and record version 001 in
the deployment change log. No migration runner or startup migration is added.
The migration is additive, transactional, nullable, and has no default/backfill.

For new installations the updated baseline `../schema/users.sql` already
contains the column; record 001 as satisfied and do not run the ALTER again.
CREATE TABLE IF NOT EXISTS does not upgrade an existing users table.

## Deployment and legacy sessions

1. Obtain separate approval, verify recovery arrangements, and schedule a short
   maintenance window. Stop incoming traffic and drain in-flight requests on
   every old backend instance. Keep traffic stopped if any step fails.
2. Apply and record the additive migration. A failed SQL transaction must be
   rolled back through the database tool before continuing.
3. Deploy the expiry-aware backend and frontend to all instances. Do not serve
   traffic through a mixture of backends that enforce and ignore expiry.
4. Explicitly invalidate legacy sessions using the reviewed SQL below. Their
   creation time is unknown; do not give them a new 24-hour lifetime. This SQL
   clears only tokens lacking expiry, leaving newly issued sessions intact.

   ```sql
   BEGIN;
   UPDATE users
   SET token = NULL, token_expires_at = NULL
   WHERE token IS NOT NULL AND token_expires_at IS NULL;
   COMMIT;
   ```

5. Verify schema and behavior in an approved test environment before resuming
   traffic: new login gets a 24-hour deadline; valid requests succeed; legacy,
   expired and revoked tokens get 401; a database outage gets safe 500. Inspect
   aggregates or schema metadata only; never print token values or user rows.
6. Resume traffic only after all instances are updated. Existing users must log
   in again; account, interview, answer and result data are not modified.

Tokens remain random strings in the existing Authorization header. PostgreSQL
sets token and expiry together with statement_timestamp() + INTERVAL '24 hours'.
Every token lookup requires expiry strictly greater than statement_timestamp().
Refresh and activity never extend it. Expired rows need no cleanup job for
enforcement. Requests admitted before expiry may finish; later requests need a
new login. No interview request is retried automatically. Unsent answers can
require re-entry after sign-in; saved interview data is retained.

## Rollback

Prefer retaining the additive column and expiry-aware backend while fixing or
reverting frontend changes. A schema rollback is not needed for that approach.
Before a migration transaction commits, use transaction rollback on failure.

If full schema removal is separately approved:

1. Stop/drain authenticated traffic on every instance. Keep authentication
   disabled throughout the rollback.
2. Stage compatible backend code that does not reference the expiry column;
   ensure no current backend can query the database during column removal.
3. Apply `001_add_token_expires_at.down.sql`. It irreversibly revokes all
   remaining sessions before dropping the column. Record the rollback.
4. Never restore old tokens from backups. Re-enabling a pre-expiry backend
   would issue non-expiring tokens again: keep authentication disabled unless
   accepting that loss of protection is explicitly approved.

## Local verification and remaining manual checks

Safe commands from `backend`:

```text
node --experimental-test-module-mocks --test test/contact.routes.test.js test/user.me.test.js test/user.logout.test.js
```

From `frontend`:

```text
node --experimental-vm-modules --test test/auth.logout.test.js test/auth.storage.test.js test/protected.routes.test.js
```

Tests mock the database boundary and assert the SQL policy and simulated expiry
boundaries. They do not execute PostgreSQL or prove engine-level SQL semantics.
After separate approval, validate up/down scripts on a disposable PostgreSQL
database, and verify expiry before/equal/after the deadline, null expiry, atomic
issuance, token-conditional revocation, and concurrent login/logout. Do not use
real credentials or live user records in test fixtures. A real browser check of
refresh, expiry redirect and logout failure handling is also still required.
