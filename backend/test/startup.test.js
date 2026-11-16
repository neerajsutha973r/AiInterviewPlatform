import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

let query;
let events;
let app;
const server = {};

// The real PostgreSQL module and its dotenv initialization never execute.
mock.module("../src/db/connection.js", {
    defaultExport: { query: (...args) => query(...args) },
});
const { default: startServer } = await import("../src/startup.js");

beforeEach(() => {
    events = [];
    app = {
        listen: port => {
            assert.equal(port, 8123);
            events.push("listen");
            return server;
        },
    };
});

afterEach(() => {
    mock.timers.reset();
});

test("startup waits for schema readiness before opening the HTTP listener", async () => {
    let resolve;
    const pending = new Promise(ready => { resolve = ready; });
    query = sql => {
        events.push("schema check");
        // Guard against accidentally reading sensitive rows or running DDL.
        assert.match(sql.trim(), /^SELECT\b/);
        assert.match(sql, /FROM pg_catalog\.pg_attribute/);
        assert.match(sql, /pg_catalog\.to_regclass\('users'\)/);
        assert.match(sql, /'token_expires_at'/);
        assert.match(sql, /'pg_catalog\.timestamptz'::pg_catalog\.regtype/);
        assert.doesNotMatch(sql, /\b(?:CREATE|ALTER|DROP|UPDATE|INSERT|DELETE)\b/i);
        return pending;
    };

    const startup = startServer(app, 8123);
    assert.deepEqual(events, ["schema check"]);
    resolve({ rows: [{ is_timestamptz: true }] });
    assert.equal(await startup, server);
    assert.deepEqual(events, ["schema check", "listen"]);
});

for (const [description, rows] of [
    ["missing table or column", []],
    ["column with the wrong type", [{ is_timestamptz: false }]],
]) {
    test(`startup refuses ${description}`, async () => {
        query = async () => ({ rows });
        await assert.rejects(startServer(app, 8123), error => {
            assert.equal(error.code, "SCHEMA_NOT_READY");
            assert.match(error.message, /users\.token_expires_at must be TIMESTAMPTZ/);
            assert.match(error.message, /migration 001/);
            return true;
        });
        assert.deepEqual(events, []);
    });
}

test("database failure prevents listening and exposes only a fixed safe error", async () => {
    const failure = new Error("Synthetic private driver diagnostics");
    query = async () => { throw failure; };

    await assert.rejects(startServer(app, 8123), error => {
        assert.equal(error.message, "Database schema readiness check failed. Verify PostgreSQL availability.");
        assert.equal(error.cause, undefined);
        assert.doesNotMatch(error.message, /private driver/);
        return true;
    });
    assert.deepEqual(events, []);
});

test("an unresponsive database times out without opening the listener", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    query = () => new Promise(() => {});
    const startup = startServer(app, 8123);
    const rejected = assert.rejects(startup, /Database schema readiness check failed/);
    mock.timers.tick(10_000);
    await rejected;
    assert.deepEqual(events, []);
});
