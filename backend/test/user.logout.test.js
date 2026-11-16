import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import bcrypt from "bcrypt";
import express from "express";

const originalToken = "synthetic-original-token";
const password = "synthetic-test-password";
const passwordHash = await bcrypt.hash(password, 4);
const databaseNow = Date.parse("2026-01-01T00:00:00.000Z");
let storedUser;
let pauseAuthentication;
let failRevocation;
let failDatabase;
let revocationAttempts;

// Only the database boundary is mocked. No dotenv initialization, live
// database, email service or application startup runs in these tests.
mock.module("../src/db/connection.js", {
    defaultExport: {
        query: async (sql, params) => {
            if (failDatabase) throw new Error("Synthetic internal database failure");
            if (sql.startsWith("SELECT")) {
                const column = sql.includes("WHERE token") ? "token" : "username";
                if (column === "token") {
                    assert.match(sql, /token_expires_at > statement_timestamp\(\)/);
                }
                const rows = params[0] && storedUser[column] === params[0] &&
                    (column !== "token" || storedUser.token_expires_at > databaseNow)
                    ? [{ ...storedUser }] : [];
                if (column === "token" && pauseAuthentication) {
                    const pause = pauseAuthentication;
                    pauseAuthentication = null;
                    pause.reached();
                    await pause.resume;
                }
                return { rows };
            }
            if (sql.startsWith("UPDATE users SET token = NULL")) {
                revocationAttempts++;
                // The real SQL must enforce both conditions atomically.
                assert.match(sql, /WHERE id = \$1 AND token = \$2 RETURNING id/);
                assert.match(sql, /token_expires_at = NULL/);
                if (failRevocation) throw new Error("Synthetic database failure");
                if (storedUser.id === params[0] && storedUser.token === params[1]) {
                    storedUser.token = null;
                    storedUser.token_expires_at = null;
                    return { rows: [{ id: storedUser.id }] };
                }
                return { rows: [] };
            }
            if (sql.startsWith("UPDATE users SET token = $1,")) {
                assert.match(sql, /token_expires_at = statement_timestamp\(\) \+ INTERVAL '24 hours'/);
                assert.equal(params[1], storedUser.id);
                storedUser.token = params[0];
                storedUser.token_expires_at = databaseNow + 24 * 60 * 60 * 1000;
                return { rows: [] };
            }
            throw new Error("Unexpected database operation");
        },
    },
});

const { default: userRoutes } = await import("../src/routes/user.routes.js");
const { default: verifyUser } = await import("../src/middleware/auth.middleware.js");
// Stub only endpoint bodies so every real interview/answer route and its
// authentication middleware can be exercised without loading AI services.
const endpoint = (req, res) => res.json({ ok: true });
mock.module("../src/controllers/interview.controller.js", {
    namedExports: Object.fromEntries([
        "createInterview", "getAllInterviews", "getInterviewById", "deleteInterview",
        "startInterview", "getQuestions",
    ].map(name => [name, endpoint])),
});
mock.module("../src/controllers/answer.controller.js", {
    namedExports: Object.fromEntries([
        "createAnswer", "generateNextQuestion", "getAnswer", "getInterviewAnswers",
        "evaluateInterviewAnswers",
    ].map(name => [name, endpoint])),
});
const { default: interviewRoutes } = await import("../src/routes/interview.routes.js");
const { default: answerRoutes } = await import("../src/routes/answer.routes.js");
let server;
let baseURL;

before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/v1/users", userRoutes);
    app.use("/interview", interviewRoutes);
    app.use("/answer", answerRoutes);
    // Exercise the real middleware used by protected interview/answer routes
    // without importing the interview engine or calling AI services.
    app.get("/protected", verifyUser, (req, res) => res.json({ id: req.user.id }));
    server = await new Promise(resolve => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    baseURL = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    storedUser = {
        id: 7,
        name: "Test Student",
        username: "test-student",
        password: passwordHash,
        token: originalToken,
        token_expires_at: databaseNow + 24 * 60 * 60 * 1000,
    };
    pauseAuthentication = null;
    failRevocation = false;
    failDatabase = false;
    revocationAttempts = 0;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    }
    mock.restoreAll();
});

const logout = token => fetch(`${baseURL}/api/v1/users/logout`, {
    method: "POST",
    headers: token === undefined ? {} : { Authorization: token },
});
const get = (path, token) => fetch(`${baseURL}${path}`, {
    headers: { Authorization: token },
});
const login = async () => {
    const response = await fetch(`${baseURL}/api/v1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: storedUser.username, password }),
    });
    assert.equal(response.status, 200);
    return (await response.json()).token;
};

test("logout revokes the presented token and rejects its subsequent reuse", async () => {
    assert.equal((await get("/api/v1/users/me", originalToken)).status, 200);
    assert.equal((await get("/protected", originalToken)).status, 200);

    const response = await logout(originalToken);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: "Logged out successfully" });
    assert.equal(storedUser.token, null);
    assert.equal(storedUser.token_expires_at, null);
    assert.equal(revocationAttempts, 1);

    assert.equal((await get("/api/v1/users/me", originalToken)).status, 401);
    assert.equal((await get("/protected", originalToken)).status, 401);
    assert.equal((await logout(originalToken)).status, 401);
});

for (const [description, token] of [
    ["missing", undefined],
    ["empty", ""],
    ["invalid", "synthetic-invalid-token"],
]) {
    test(`logout rejects ${description} authentication without revoking anything`, async () => {
        assert.equal((await logout(token)).status, 401);
        assert.equal(storedUser.token, originalToken);
        assert.equal(revocationAttempts, 0);
    });
}

test("an old token cannot revoke a newer login", async () => {
    const newerToken = await login();
    assert.notEqual(newerToken, originalToken);
    assert.equal(storedUser.token_expires_at, databaseNow + 24 * 60 * 60 * 1000);
    assert.equal((await logout(originalToken)).status, 401);
    assert.equal(storedUser.token, newerToken);
    assert.equal((await get("/api/v1/users/me", newerToken)).status, 200);
    assert.equal((await get("/protected", newerToken)).status, 200);
});

test("a new login between logout authentication and revocation survives", async () => {
    let reached;
    let resume;
    const authenticated = new Promise(resolve => { reached = resolve; });
    const resumed = new Promise(resolve => { resume = resolve; });
    pauseAuthentication = { reached, resume: resumed };

    const pendingLogout = logout(originalToken);
    await authenticated;
    let newerToken;
    try {
        newerToken = await login();
    } finally {
        resume();
    }
    const response = await pendingLogout;
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: "Invalid token" });
    assert.equal(revocationAttempts, 1);
    assert.equal(storedUser.token, newerToken);
    assert.equal((await get("/api/v1/users/me", newerToken)).status, 200);
    assert.equal((await get("/protected", newerToken)).status, 200);
});

test("revocation failure returns an error rather than reporting success", async () => {
    failRevocation = true;
    const response = await logout(originalToken);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
        message: "Logout failed. Server revocation could not be confirmed.",
    });
    assert.equal(storedUser.token, originalToken);
});

const protectedEndpoints = [
    ["GET", "/api/v1/users/me"], ["POST", "/api/v1/users/logout"],
    ["GET", "/interview"], ["POST", "/interview"],
    ["GET", "/interview/7"], ["DELETE", "/interview/7"],
    ["POST", "/interview/7/start"], ["GET", "/interview/7/questions"],
    ["POST", "/answer/questions/7/answer"], ["POST", "/answer/questions/7/next"],
    ["GET", "/answer/questions/7/answer"], ["GET", "/answer/interviews/7/answers"],
    ["POST", "/answer/interview/7/evaluate"],
];

for (const [description, expiresAt, status] of [
    ["one millisecond before expiry", databaseNow + 1, 200],
    ["exact expiry boundary", databaseNow, 401],
    ["already expired", databaseNow - 1, 401],
    ["legacy null expiry", null, 401],
]) {
    test(`${description}: all protected routes enforce the shared expiry lookup`, async () => {
        for (const [method, path] of protectedEndpoints) {
            // Reset because a valid logout intentionally clears the session.
            storedUser.token = originalToken;
            storedUser.token_expires_at = expiresAt;
            const response = await fetch(`${baseURL}${path}`, {
                method, headers: { Authorization: originalToken },
            });
            assert.equal(response.status, status, `${method} ${path}`);
        }
    });
}

test("expired tokens remain rejected when reused and cannot be extended by activity", async () => {
    storedUser.token_expires_at = databaseNow - 1;
    for (let attempt = 0; attempt < 2; attempt++) {
        assert.equal((await get("/api/v1/users/me", originalToken)).status, 401);
        assert.equal((await get("/protected", originalToken)).status, 401);
        assert.equal((await logout(originalToken)).status, 401);
    }
    assert.equal(storedUser.token_expires_at, databaseNow - 1);
    assert.equal(revocationAttempts, 0);
});

test("valid requests never slide the absolute expiry", async () => {
    const expiry = storedUser.token_expires_at;
    await get("/api/v1/users/me", originalToken);
    await get("/protected", originalToken);
    assert.equal(storedUser.token_expires_at, expiry);
});

test("database outages return safe 500s on all authenticated routes", async () => {
    failDatabase = true;
    for (const [method, path] of protectedEndpoints) {
        const response = await fetch(`${baseURL}${path}`, {
            method, headers: { Authorization: originalToken },
        });
        assert.equal(response.status, 500, `${method} ${path}`);
        assert.deepEqual(await response.json(), { message: "Unable to verify session. Please try again." });
    }
    assert.equal(storedUser.token, originalToken);
});

test("database outages during login or registration are not reported as bad credentials", async () => {
    failDatabase = true;
    for (const [path, message] of [
        ["login", "Unable to log in. Please try again."],
        ["register", "Unable to register. Please try again."],
    ]) {
        const response = await fetch(`${baseURL}/api/v1/users/${path}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: storedUser.name, username: storedUser.username, password }),
        });
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { message });
    }
});
