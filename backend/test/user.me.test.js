import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import express from "express";

const profile = { id: 7, name: "Test Student", username: "test-student" };
const storedUser = {
    ...profile,
    password: "synthetic-password-hash",
    token: "synthetic-session-token",
    token_expires_at: "2099-01-01T00:00:00.000Z",
    password_reset_token: "synthetic-reset-token",
    internal_notes: "Private database field",
    created_at: "2026-01-01T00:00:00.000Z",
};

// Mock the connection before loading the real router, controller, service and
// model. The database connection and its dotenv initialization never execute.
mock.module("../src/db/connection.js", {
    defaultExport: {
        query: async (sql, params) => {
            assert.match(sql, /WHERE token = \$1/);
            return {
                rows: params[0] === storedUser.token ? [{ ...storedUser }] : [],
            };
        },
    },
});

const { default: userRoutes } = await import("../src/routes/user.routes.js");
let server;
let baseURL;

before(async () => {
    const app = express();
    app.use("/api/v1/users", userRoutes);
    server = await new Promise(resolve => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    }
    mock.restoreAll();
});

test("GET /me returns only the flat profile expected by AuthContext", async () => {
    const response = await fetch(`${baseURL}/api/v1/users/me`, {
        headers: { Authorization: storedUser.token },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, profile);
    for (const field of Object.keys(storedUser)) {
        if (!Object.hasOwn(profile, field)) {
            assert.equal(Object.hasOwn(body, field), false);
        }
    }
});

for (const [description, headers] of [
    ["missing authentication", {}],
    ["invalid authentication", { Authorization: "synthetic-invalid-token" }],
    ["empty authentication", { Authorization: "" }],
]) {
    test(`GET /me rejects ${description}`, async () => {
        const response = await fetch(`${baseURL}/api/v1/users/me`, { headers });

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { message: "User not found" });
    });
}
