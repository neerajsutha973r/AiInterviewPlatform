import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import express from "express";

const submissions = [];
const managementCalls = [];

// Replace the service before importing the real router and controller.
// The real service loads dotenv, PostgreSQL and email delivery; none run here.
mock.module("../src/services/contact.service.js", {
    namedExports: {
        createContact: async (data) => {
            submissions.push(data);
            return { id: 1, ...data };
        },
        ...Object.fromEntries(
            ["getAllContacts", "getContactById", "deleteContact"].map(name => [
                name,
                async () => {
                    managementCalls.push(name);
                    throw new Error("Management service must never be called");
                },
            ])
        ),
    },
});

const { default: contactRoutes } = await import("../src/routes/contact.routes.js");
let server;
let baseURL;

beforeEach(() => {
    submissions.length = 0;
    managementCalls.length = 0;
});

before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        // Simulate upstream authentication without importing the real DB-backed
        // middleware. Even a claimed admin must be denied by these routes.
        if (req.headers["x-test-user"] === "student") {
            req.user = { id: 1, role: "student" };
        } else if (req.headers["x-test-user"] === "admin") {
            req.user = { id: 2, role: "admin", isAdmin: true };
        }
        next();
    });
    app.use("/contact", contactRoutes);
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

test("public contact submission still reaches the real controller", async () => {
    const data = {
        name: "Test Student",
        email: "student@example.com",
        subject: "Practice question",
        message: "Please help with interview practice.",
    };
    const response = await fetch(`${baseURL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
        message: "Message sent successfully",
        data: { id: 1, ...data },
    });
    assert.deepEqual(submissions, [data]);
});

test("public submission retains required-field validation", async () => {
    const response = await fetch(`${baseURL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Student" }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "Please provide all fields" });
    assert.deepEqual(submissions, []);
});

for (const [caller, headers] of [
    ["anonymous", {}],
    ["token-bearing", { Authorization: "synthetic-test-token" }],
    ["authenticated student", { "x-test-user": "student" }],
    ["claimed admin", { "x-test-user": "admin" }],
]) {
    for (const [method, path] of [
        ["GET", "/contact"],
        ["GET", "/contact/1"],
        ["DELETE", "/contact/1"],
    ]) {
        test(`${caller}: ${method} ${path} is disabled`, async () => {
            const response = await fetch(`${baseURL}${path}`, { method, headers });

            assert.equal(response.status, 403);
            assert.deepEqual(await response.json(), {
                message: "Contact management is disabled",
            });
            assert.deepEqual(managementCalls, []);
        });
    }
}
