import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { transformWithOxc } from "vite";

// Transform only these explicit source files in memory. Do not start Vite,
// load app configuration, or load environment files.
const contextSource = await readFile(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8");
const { code: contextCode } = await transformWithOxc(contextSource, "AuthContext.jsx", {
    jsx: { runtime: "automatic" },
});
const serviceCode = await readFile(new URL("../src/services/authServcie.js", import.meta.url), "utf8");
const storageCode = await readFile(new URL("../src/services/authStorage.js", import.meta.url), "utf8");

async function loadModule(code, dependencies, globals = {}) {
    const context = vm.createContext(globals);
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        if (specifier.endsWith("/authStorage")) {
            return new vm.SourceTextModule(storageCode, { context });
        }
        const exports = dependencies[specifier];
        assert.ok(exports, `Unexpected import: ${specifier}`);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

const profile = { id: 7, name: "Test Student", username: "test-student" };

async function createAuthHarness(revoke) {
    const states = [];
    const refs = [];
    const events = [];
    let stateIndex;
    let refIndex;
    let token = "synthetic-test-token";
    const { default: AuthProvider } = await loadModule(contextCode, {
        react: {
            createContext: () => ({ Provider: "Provider" }),
            useEffect: () => {}, // Session restoration is outside these logout tests.
            useState: initial => {
                const index = stateIndex++;
                if (!(index in states)) states[index] = initial;
                return [states[index], value => {
                    states[index] = value;
                    if (index === 0) events.push("clear user");
                }];
            },
            useRef: initial => {
                const index = refIndex++;
                refs[index] ??= { current: initial };
                return refs[index];
            },
        },
        "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
        "react-router-dom": {
            Navigate: () => {},
            useNavigate: () => path => events.push(`navigate ${path}`),
        },
        "../services/authServcie": { default: { logout: revoke } },
        "../services/api": { subscribeToSessionInvalidation: () => () => {} },
    }, {
        sessionStorage: {
            getItem: () => token,
            removeItem: key => {
                assert.equal(key, "token");
                events.push("clear token");
                token = null;
            },
        },
    });

    const render = () => {
        stateIndex = 0;
        refIndex = 0;
        return AuthProvider({ children: null }).props.value;
    };
    render();
    states[0] = profile;
    return { render, events, getToken: () => token };
}

test("logout waits for server confirmation before clearing state and navigating", async () => {
    let confirm;
    const pending = new Promise(resolve => { confirm = resolve; });
    const harness = await createAuthHarness(token => {
        assert.equal(token, "synthetic-test-token");
        return pending;
    });
    const completion = harness.render().logout();

    assert.equal(harness.render().isLoggingOut, true);
    assert.equal(harness.render().isAuthenticated, true);
    assert.equal(harness.getToken(), "synthetic-test-token");
    assert.deepEqual(harness.events, []);
    confirm();
    await completion;

    assert.deepEqual(harness.events, ["clear token", "clear user", "navigate /"]);
    assert.equal(harness.getToken(), null);
    assert.equal(harness.render().isAuthenticated, false);
    assert.equal(harness.render().isLoggingOut, false);
    assert.equal(harness.render().logoutError, "");
});

for (const reason of ["Network failure", "Timeout", "Unclassified failure"]) {
    test(`${reason} preserves local authentication and reports unconfirmed logout`, async () => {
        const harness = await createAuthHarness(async () => { throw new Error(reason); });
        await harness.render().logout();

        assert.equal(harness.render().user, profile);
        assert.equal(harness.render().isAuthenticated, true);
        assert.equal(harness.getToken(), "synthetic-test-token");
        assert.deepEqual(harness.events, []);
        assert.equal(harness.render().isLoggingOut, false);
        assert.match(harness.render().logoutError, /could not be confirmed.*Please retry/);
    });
}

test("duplicate clicks send one logout request", async () => {
    let confirm;
    let calls = 0;
    const pending = new Promise(resolve => { confirm = resolve; });
    const harness = await createAuthHarness(() => { calls++; return pending; });
    const completion = harness.render().logout();
    await harness.render().logout();
    assert.equal(calls, 1);
    confirm();
    await completion;
    assert.deepEqual(harness.events, ["clear token", "clear user", "navigate /"]);
});

test("logout can be retried after failure", async () => {
    let calls = 0;
    const harness = await createAuthHarness(async () => {
        if (++calls === 1) throw new Error("Network failure");
    });
    await harness.render().logout();
    assert.ok(harness.render().logoutError);
    await harness.render().logout();
    assert.equal(calls, 2);
    assert.equal(harness.render().logoutError, "");
    assert.equal(harness.render().isAuthenticated, false);
});

test("auth service posts logout with a finite timeout", async () => {
    let calls = 0;
    const { default: service } = await loadModule(serviceCode, {
        "./api": { default: { post: async (path, data, config) => {
            calls++;
            assert.equal(path, "/api/v1/users/logout");
            assert.equal(data, undefined);
            assert.equal(config.timeout, 10000);
            assert.equal(config.headers.authorization, "synthetic-test-token");
            return { data: { message: "Logged out successfully" } };
        } } },
    });
    assert.equal((await service.logout("synthetic-test-token")).message, "Logged out successfully");
    assert.equal(calls, 1);
});

test("auth service propagates logout failures to AuthContext", async () => {
    const failure = new Error("Network failure");
    const { default: service } = await loadModule(serviceCode, {
        "./api": { default: { post: async () => { throw failure; } } },
    });
    await assert.rejects(service.logout(), error => error === failure);
});
