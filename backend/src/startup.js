import db from "./db/connection.js";

// Resolve the same unqualified users table used by the authentication queries.
// Inspect catalog metadata only; never read user records or change the schema.
const schemaQuery = `
  SELECT a.atttypid = 'pg_catalog.timestamptz'::pg_catalog.regtype AS is_timestamptz
  FROM pg_catalog.pg_attribute a
  WHERE a.attrelid = pg_catalog.to_regclass('users')
    AND a.attname = 'token_expires_at'
    AND a.attnum > 0
    AND NOT a.attisdropped
`;

async function startServer(app, port) {
  let timeout;
  let result;
  try {
    result = await Promise.race([
      db.query(schemaQuery),
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Readiness timeout")), 10_000);
      }),
    ]);
  } catch {
    // Do not retain or expose the driver's error, connection details or cause.
    throw new Error("Database schema readiness check failed. Verify PostgreSQL availability.");
  } finally {
    clearTimeout(timeout);
  }

  if (result.rows[0]?.is_timestamptz !== true) {
    const error = new Error("Schema not ready: users.token_expires_at must be TIMESTAMPTZ. Apply migration 001 before starting.");
    error.code = "SCHEMA_NOT_READY";
    throw error;
  }

  return app.listen(port, () => {
    console.log(`server is listening on ${port}`);
  });
}

export default startServer;
