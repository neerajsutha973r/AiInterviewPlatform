import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { transformWithOxc } from "vite";
import axios from "axios";

// Explicit source reads and in-memory JSX transforms only: no Vite server,
// application configuration, environment files, or real network requests.
const apiCode = await readFile(new URL("../src/services/api.js", import.meta.url), "utf8");
const storageCode = await readFile(new URL("../src/services/authStorage.js", import.meta.url), "utf8");
const serviceCode = await readFile(new URL("../src/services/authServcie.js", import.meta.url), "utf8");
const contextSource = await readFile(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8");
const loginSource = await readFile(new URL("../src/components/LoginForm/LoginForm.jsx", import.meta.url), "utf8");
const { code: contextCode } = await transformWithOxc(contextSource, "AuthContext.jsx", {
    jsx: { runtime: "automatic" },
});
const { code: loginCode } = await transformWithOxc(loginSource, "LoginForm.jsx", {
    jsx: { runtime: "automatic" },
});

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

function storageFixture(initial = {}) {
    const entries = new Map(Object.entries(initial));
    return {
        getItem: key => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, String(value)),
        removeItem: key => entries.delete(key),
    };
}

function legacyFixture() {
    const keys = new Set(["token", "unrelated-preference"]);
    const removals = [];
    return {
        keys,
        removals,
        storage: {
            // Any attempt to read or migrate the legacy value fails the test.
            getItem: () => { throw new Error("Legacy storage must never be read"); },
            setItem: () => { throw new Error("Legacy storage must never be written"); },
            clear: () => { throw new Error("Unrelated storage must not be cleared"); },
            removeItem: key => { removals.push(key); keys.delete(key); },
        },
    };
}

async function createClient(sessionStorage, request) {
    const legacy = legacyFixture();
    const globals = { sessionStorage, localStorage: legacy.storage, AbortController, setTimeout, clearTimeout };
    const requests = [];
    let interceptor;
    let rejectResponse;
    const send = async (method, url, data, options = {}) => {
        const config = interceptor({
            method, url, data, ...options,
            headers: axios.AxiosHeaders.from(options.headers),
        });
        requests.push(config);
        try {
            return await request(config);
        } catch (error) {
            error.config ??= config;
            return rejectResponse(error);
        }
    };
    const transport = {
        interceptors: {
            request: { use: callback => { interceptor = callback; } },
            response: { use: (resolve, reject) => { rejectResponse = reject; } },
        },
        get: (url, options) => send("GET", url, undefined, options),
        post: (url, data, options) => send("POST", url, data, options),
    };
    const apiModule = await loadModule(apiCode, {
        axios: { default: { create: () => transport } },
    }, globals);
    const api = apiModule.default;
    const { default: service } = await loadModule(serviceCode, {
        "./api": { default: api },
    }, globals);
    return { api, service, globals, requests, legacy, subscribeToSessionInvalidation: apiModule.subscribeToSessionInvalidation };
}

async function createRealClient(sessionStorage, request, configureGlobals = () => {}) {
    const globals = { sessionStorage, localStorage: legacyFixture().storage, AbortController, setTimeout, clearTimeout };
    configureGlobals(globals);
    const apiModule = await loadModule(apiCode, { axios: { default: axios } }, globals);
    const api = apiModule.default;
    api.defaults.adapter = async config => ({
        status: 200, statusText: "OK", headers: {}, config,
        ...await request(config),
    });
    const { default: service } = await loadModule(serviceCode, { "./api": { default: api } }, globals);
    return { api, service, globals, subscribeToSessionInvalidation: apiModule.subscribeToSessionInvalidation };
}

function unauthorized(config) {
    return new axios.AxiosError("Synthetic unauthorized response", "ERR_BAD_REQUEST", config,
        undefined, { status: 401, data: {}, headers: {}, config });
}

function hooksHarness() {
    const states = [];
    const refs = [];
    const effects = [];
    const cleanups = [];
    let stateIndex;
    let refIndex;
    let mounted = false;
    return {
        react: {
            createContext: () => ({ Provider: "Provider" }),
            useState: initial => {
                const index = stateIndex++;
                if (!(index in states)) states[index] = initial;
                return [states[index], value => {
                    states[index] = typeof value === "function" ? value(states[index]) : value;
                }];
            },
            useRef: initial => {
                const index = refIndex++;
                refs[index] ??= { current: initial };
                return refs[index];
            },
            useEffect: effect => { if (!mounted) effects.push(effect); },
        },
        render: Component => {
            stateIndex = 0;
            refIndex = 0;
            const tree = Component({ children: null });
            mounted = true;
            return tree;
        },
        flushEffects: async () => {
            for (const effect of effects.splice(0)) {
                const cleanup = effect();
                if (typeof cleanup === "function") cleanups.push(cleanup);
            }
            await new Promise(resolve => setImmediate(resolve));
        },
        cleanup: () => {
            for (const cleanup of cleanups.splice(0)) cleanup();
            mounted = false;
        },
    };
}

const jsxRuntime = {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
};
const profile = { id: 7, name: "Test Student", username: "test-student" };
const sessionToken = "synthetic-tab-token";

async function mountAuth(client) {
    const hooks = hooksHarness();
    const navigations = [];
    const { default: AuthProvider } = await loadModule(contextCode, {
        react: hooks.react,
        "react/jsx-runtime": jsxRuntime,
        "react-router-dom": {
            Navigate: () => {},
            useNavigate: () => path => navigations.push(path),
        },
        "../services/authServcie": { default: client.service },
        "../services/api": { subscribeToSessionInvalidation: client.subscribeToSessionInvalidation },
    }, client.globals);
    const render = () => hooks.render(AuthProvider).props.value;
    render();
    return { render, navigations, restore: hooks.flushEffects, cleanup: hooks.cleanup };
}

function findElement(tree, type, name) {
    if (!tree || typeof tree !== "object") return undefined;
    if (tree.type === type && (!name || tree.props.name === name)) return tree;
    const children = tree.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
        const match = findElement(child, type, name);
        if (match) return match;
    }
}

async function mountLogin(client) {
    const hooks = hooksHarness();
    const users = [];
    const navigations = [];
    const { default: LoginForm } = await loadModule(loginCode, {
        react: hooks.react,
        "react/jsx-runtime": jsxRuntime,
        "react-router-dom": { useNavigate: () => path => navigations.push(path) },
        "../../services/authServcie.js": { default: client.service },
        "../../hooks/useAuth.jsx": { default: () => ({ login: user => users.push(user) }) },
        "./LoginForm.css": {},
    }, client.globals);
    const render = () => hooks.render(LoginForm);
    for (const [name, value] of [["username", "test-student"], ["password", "synthetic-password"]]) {
        findElement(render(), "input", name).props.onChange({ target: { name, value } });
    }
    return { render, users, navigations, submit: () => findElement(render(), "form").props.onSubmit({ preventDefault() {} }) };
}

test("API initialization deletes only the legacy token without reading or migrating it", async () => {
    const storage = storageFixture({ token: sessionToken });
    const client = await createClient(storage, async () => ({ data: [] }));
    assert.equal(client.legacy.keys.has("token"), false);
    assert.equal(client.legacy.keys.has("unrelated-preference"), true);
    assert.deepEqual(client.legacy.removals, ["token"]);
    assert.equal(storage.getItem("token"), sessionToken);

    await client.api.get("/interview");
    assert.equal(client.requests[0].headers.authorization, sessionToken);
    storage.removeItem("token");
    await client.api.get("/interview");
    assert.equal(Object.hasOwn(client.requests[1].headers, "authorization"), false);
});

test("login stores its token in sessionStorage only after successful authentication", async () => {
    const storage = storageFixture();
    let confirm;
    const pending = new Promise(resolve => { confirm = resolve; });
    const client = await createClient(storage, () => pending);
    const form = await mountLogin(client);
    const completion = form.submit();
    assert.equal(storage.getItem("token"), null);
    assert.equal(client.requests[0].url, "/api/v1/users/login");
    assert.equal(client.requests[0].headers.authorization, undefined);
    assert.equal(client.requests[0].data.username, "test-student");
    assert.deepEqual(form.users, []);
    assert.deepEqual(form.navigations, []);

    confirm({ data: { token: sessionToken, user: profile } });
    await completion;
    assert.equal(storage.getItem("token"), sessionToken);
    assert.deepEqual(form.users, [profile]);
    assert.deepEqual(form.navigations, ["/dashboard"]);
});

test("failed login does not store a token or authenticate the frontend", async () => {
    const storage = storageFixture();
    const client = await createClient(storage, async () => { throw new Error("Synthetic login failure"); });
    const form = await mountLogin(client);
    await form.submit();
    assert.equal(storage.getItem("token"), null);
    assert.deepEqual(form.users, []);
    assert.deepEqual(form.navigations, []);
});

test("a fresh AuthProvider restores authentication after a same-tab refresh", async () => {
    const storage = storageFixture({ token: sessionToken });
    for (let load = 0; load < 2; load++) {
        // A refresh creates new modules and React state but retains tab storage.
        const client = await createClient(storage, async config => {
            assert.equal(config.url, "/api/v1/users/me");
            assert.equal(config.headers.authorization, sessionToken);
            return { data: profile };
        });
        const auth = await mountAuth(client);
        assert.equal(auth.render().isAuthLoading, true);
        assert.equal(auth.render().isAuthenticated, false);
        await auth.restore();
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().isAuthenticated, true);
        assert.equal(auth.render().user, profile);
        assert.equal(storage.getItem("token"), sessionToken);
    }
});

test("without retained tab storage, legacy authentication is not restored", async () => {
    // Models a normal tab close followed by a new independent tab session.
    const storage = storageFixture();
    const client = await createClient(storage, async config => {
        assert.equal(config.headers.authorization, null);
        throw new Error("Synthetic unauthenticated response");
    });
    const auth = await mountAuth(client);
    await auth.restore();
    assert.equal(client.requests.length, 0);
    assert.equal(client.legacy.keys.has("token"), false);
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(storage.getItem("token"), null);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(auth.render().user, null);
});

test("logout presents the tab token and clears it only after confirmed server revocation", async () => {
    const storage = storageFixture({ token: sessionToken });
    let failLogout = true;
    const client = await createClient(storage, async config => {
        assert.equal(config.headers.authorization, sessionToken);
        if (config.url.endsWith("/me")) return { data: profile };
        assert.equal(config.url, "/api/v1/users/logout");
        assert.equal(config.method, "POST");
        if (failLogout) throw new Error("Synthetic network failure");
        return { data: { message: "Logged out successfully" } };
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await auth.render().logout();
    assert.equal(storage.getItem("token"), sessionToken);
    assert.equal(auth.render().isAuthenticated, true);
    assert.match(auth.render().logoutError, /could not be confirmed.*Please retry/);
    assert.deepEqual(auth.navigations, []);

    failLogout = false;
    await auth.render().logout();
    assert.equal(storage.getItem("token"), null);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(auth.render().logoutError, "");
    assert.deepEqual(auth.navigations, ["/"]);
});

test("authentication stays loading until a delayed /me response succeeds", async () => {
    let confirm;
    const pending = new Promise(resolve => { confirm = resolve; });
    const client = await createClient(storageFixture({ token: sessionToken }), () => pending);
    const auth = await mountAuth(client);
    await auth.restore();
    assert.equal(client.requests.length, 1);
    assert.equal(auth.render().isAuthLoading, true);
    assert.equal(auth.render().isAuthenticated, false);

    confirm({ data: profile });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().isAuthenticated, true);
});

for (const reason of ["HTTP 401", "Network failure"]) {
    test(`authentication finishes loading when /me rejects with ${reason}`, async () => {
        let reject;
        const pending = new Promise((resolve, rejectRequest) => { reject = rejectRequest; });
        const client = await createClient(storageFixture({ token: sessionToken }), () => pending);
        const auth = await mountAuth(client);
        await auth.restore();
        assert.equal(auth.render().isAuthLoading, true);
        reject(reason === "HTTP 401" ? apiFailure(401) : new Error(reason));
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().isAuthenticated, false);
    });
}

function apiFailure(status) {
    const error = new Error("Synthetic API failure");
    if (status !== undefined) error.response = { status };
    return error;
}

test("expired refresh removes the rejected session and completes authentication loading", async () => {
    const storage = storageFixture({ token: sessionToken });
    const client = await createClient(storage, async () => { throw apiFailure(401); });
    const auth = await mountAuth(client);
    await auth.restore();
    assert.equal(storage.getItem("token"), null);
    assert.equal(auth.render().user, null);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(client.requests.length, 1);
});

test("authenticated interview 401 resets auth and never retries the mutation", async () => {
    const storage = storageFixture({ token: sessionToken, preference: "keep" });
    const client = await createClient(storage, async config => {
        if (config.url.endsWith("/me")) return { data: profile };
        throw apiFailure(401);
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await assert.rejects(client.api.post("/answer/questions/7/answer", { answer: "test answer" }));
    assert.equal(storage.getItem("token"), null);
    assert.equal(storage.getItem("preference"), "keep");
    assert.equal(auth.render().user, null);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(client.requests.length, 2); // /me and one answer submission.
});

test("stale 401 cannot remove a newer login or reset its profile", async () => {
    const storage = storageFixture({ token: sessionToken });
    let reject;
    const pending = new Promise((resolve, rejectRequest) => { reject = rejectRequest; });
    const client = await createClient(storage, config => config.url.endsWith("/me")
        ? { data: profile } : pending);
    const auth = await mountAuth(client);
    await auth.restore();
    const request = client.api.get("/interview");
    const newerProfile = { ...profile, name: "Newer login" };
    storage.setItem("token", "synthetic-newer-token");
    auth.render().login(newerProfile);
    reject(apiFailure(401));
    await assert.rejects(request);
    assert.equal(storage.getItem("token"), "synthetic-newer-token");
    assert.equal(auth.render().user, newerProfile);
    assert.equal(auth.render().isAuthenticated, true);
});

test("an old successful /me response cannot restore an invalidated session", async () => {
    const storage = storageFixture({ token: sessionToken });
    let confirm;
    const pending = new Promise(resolve => { confirm = resolve; });
    const client = await createClient(storage, config => {
        if (config.url.endsWith("/me")) return pending;
        throw apiFailure(401);
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await assert.rejects(client.api.get("/interview"));
    confirm({ data: profile });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(storage.getItem("token"), null);
    assert.equal(auth.render().isAuthenticated, false);
});

for (const status of [undefined, 403, 500]) {
    test(`${status ?? "network"} failure retains current auth and never retries`, async () => {
        const storage = storageFixture({ token: sessionToken });
        const client = await createClient(storage, async config => {
            if (config.url.endsWith("/me")) return { data: profile };
            throw apiFailure(status);
        });
        const auth = await mountAuth(client);
        await auth.restore();
        await assert.rejects(client.api.post("/interview/7/start"));
        assert.equal(storage.getItem("token"), sessionToken);
        assert.equal(auth.render().isAuthenticated, true);
        assert.equal(client.requests.length, 2);
    });
}

for (const method of ["login", "signup"]) {
    test(`${method} rejection does not invalidate an existing session`, async () => {
        const storage = storageFixture({ token: sessionToken });
        const client = await createClient(storage, async config => {
            if (config.url.endsWith("/me")) return { data: profile };
            throw apiFailure(401);
        });
        const auth = await mountAuth(client);
        await auth.restore();
        await assert.rejects(client.service[method]({ username: "synthetic-user" }));
        assert.equal(storage.getItem("token"), sessionToken);
        assert.equal(auth.render().isAuthenticated, true);
    });
}

test("logout 401 clears invalid auth without claiming revocation or retained session", async () => {
    const storage = storageFixture({ token: sessionToken });
    const client = await createClient(storage, async config => {
        if (config.url.endsWith("/me")) return { data: profile };
        throw apiFailure(401);
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await auth.render().logout();
    assert.equal(storage.getItem("token"), null);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(auth.render().logoutError, "");
    // ProtectedRoute handles login redirection; no successful-logout navigation.
    assert.deepEqual(auth.navigations, []);
});

test("a stale successful logout cannot clear a newer session", async () => {
    const storage = storageFixture({ token: sessionToken });
    let confirm;
    const pending = new Promise(resolve => { confirm = resolve; });
    const client = await createClient(storage, config => config.url.endsWith("/me")
        ? { data: profile } : pending);
    const auth = await mountAuth(client);
    await auth.restore();
    const logout = auth.render().logout();
    storage.setItem("token", "synthetic-newer-token");
    const newerProfile = { ...profile, name: "Newer login" };
    auth.render().login(newerProfile);
    confirm({ data: { message: "Logged out successfully" } });
    await logout;
    assert.equal(storage.getItem("token"), "synthetic-newer-token");
    assert.equal(auth.render().user, newerProfile);
    assert.deepEqual(auth.navigations, []);
});

for (const stale of [false, true]) {
    test(`real Axios headers: ${stale ? "stale" : "matching"} 401 handles the correct session`, async () => {
        const storage = storageFixture({ token: sessionToken });
        const legacy = legacyFixture();
        const { default: api, subscribeToSessionInvalidation } = await loadModule(apiCode, {
            axios: { default: axios },
        }, { sessionStorage: storage, localStorage: legacy.storage });
        let invalidations = 0;
        const unsubscribe = subscribeToSessionInvalidation(() => { invalidations++; });
        // An adapter replaces all network I/O while preserving Axios's real
        // request/response pipeline, including its AxiosHeaders class.
        api.defaults.adapter = async config => {
            assert.equal(config.headers.get("authorization"), sessionToken);
            if (stale) storage.setItem("token", "synthetic-newer-token");
            throw new axios.AxiosError("Synthetic unauthorized response", "ERR_BAD_REQUEST", config,
                undefined, { status: 401, data: {}, headers: {}, config });
        };
        await assert.rejects(api.post("/answer/questions/7/answer", { answer: "test answer" }));
        assert.equal(storage.getItem("token"), stale ? "synthetic-newer-token" : null);
        assert.equal(invalidations, stale ? 0 : 1);
        unsubscribe();
    });
}

for (const initialToken of [sessionToken, null]) {
    test(`real Axios logout keeps its initiated token (${initialToken ? "session A" : "missing token"}) when login B precedes dispatch`, async () => {
        const newerToken = "synthetic-newer-token";
        const newerProfile = { ...profile, name: "Newer login" };
        const storage = storageFixture(initialToken ? { token: initialToken } : {});
        let serverToken = initialToken;
        let presentedToken;
        let logoutRequests = 0;
        const client = await createRealClient(storage, async config => {
            if (config.url.endsWith("/login")) {
                serverToken = newerToken;
                return { data: { token: newerToken, user: newerProfile } };
            }
            const token = config.headers.get("authorization");
            if (config.url.endsWith("/logout")) {
                logoutRequests++;
                presentedToken = token;
                if (!token || token !== serverToken) throw unauthorized(config);
                serverToken = null;
                return { data: { message: "Logged out successfully" } };
            }
            if (!token || token !== serverToken) throw unauthorized(config);
            return { data: profile };
        });
        const auth = await mountAuth(client);
        await auth.restore();

        let entered;
        let release;
        const dispatchReached = new Promise(resolve => { entered = resolve; });
        const dispatchGate = new Promise(resolve => { release = resolve; });
        // Axios runs request interceptors in reverse registration order. This
        // gate delays the application's real auth interceptor deterministically.
        client.api.interceptors.request.use(async config => {
            if (config.url.endsWith("/logout")) { entered(); await dispatchGate; }
            return config;
        });
        const completion = auth.render().logout();
        await dispatchReached;
        try {
            const login = await client.service.login({ username: "test-student", password: "synthetic-password" });
            storage.setItem("token", login.token);
            auth.render().login(login.user);
        } finally {
            release();
        }
        await completion;

        assert.equal(presentedToken, initialToken);
        assert.equal(logoutRequests, 1);
        assert.equal(serverToken, newerToken);
        assert.equal(storage.getItem("token"), newerToken);
        assert.equal(auth.render().user, newerProfile);
        assert.equal(auth.render().isAuthenticated, true);
        assert.equal(auth.render().logoutError, "");
        assert.deepEqual(auth.navigations, []);
        assert.equal((await client.api.get("/interview")).status, 200);
    });
}

test("real Axios stale successful logout response preserves login B", async () => {
    const storage = storageFixture({ token: sessionToken });
    const newerToken = "synthetic-newer-token";
    const newerProfile = { ...profile, name: "Newer login" };
    let serverToken = sessionToken;
    let acknowledge;
    let release;
    const revoked = new Promise(resolve => { acknowledge = resolve; });
    const responseGate = new Promise(resolve => { release = resolve; });
    const client = await createRealClient(storage, async config => {
        if (config.url.endsWith("/login")) {
            serverToken = newerToken;
            return { data: { token: newerToken, user: newerProfile } };
        }
        const token = config.headers.get("authorization");
        if (!token || token !== serverToken) throw unauthorized(config);
        if (config.url.endsWith("/logout")) {
            assert.equal(token, sessionToken);
            serverToken = null;
            acknowledge();
            await responseGate;
        }
        return { data: profile };
    });
    const auth = await mountAuth(client);
    await auth.restore();
    const completion = auth.render().logout();
    await revoked;
    try {
        const login = await client.service.login({ username: "test-student", password: "synthetic-password" });
        storage.setItem("token", login.token);
        auth.render().login(login.user);
    } finally {
        release();
    }
    await completion;
    assert.equal(serverToken, newerToken);
    assert.equal(storage.getItem("token"), newerToken);
    assert.equal(auth.render().user, newerProfile);
    assert.deepEqual(auth.navigations, []);
    assert.equal((await client.api.get("/interview")).status, 200);
});

for (const outcome of ["success", "invalid", "network failure"]) {
    test(`real Axios bound logout preserves ${outcome} behavior`, async () => {
        const storage = storageFixture({ token: sessionToken });
        let logoutRequests = 0;
        const client = await createRealClient(storage, async config => {
            assert.equal(config.headers.get("authorization"), sessionToken);
            if (config.url.endsWith("/logout")) {
                logoutRequests++;
                if (outcome === "invalid") throw unauthorized(config);
                if (outcome === "network failure") throw new axios.AxiosError("Synthetic network failure", "ERR_NETWORK", config);
            }
            return { data: profile };
        });
        const auth = await mountAuth(client);
        await auth.restore();
        await auth.render().logout();
        assert.equal(logoutRequests, 1);
        assert.equal(storage.getItem("token"), outcome === "network failure" ? sessionToken : null);
        assert.equal(auth.render().isAuthenticated, outcome === "network failure");
        assert.deepEqual(auth.navigations, outcome === "success" ? ["/"] : []);
        if (outcome === "network failure") assert.match(auth.render().logoutError, /could not be confirmed/);
        else assert.equal(auth.render().logoutError, "");
    });
}

for (const lateOutcome of ["success", "401", "network failure", "timeout"]) {
    test(`login completes loading immediately and ignores a late restoration ${lateOutcome}`, async () => {
        const storage = storageFixture({ token: sessionToken });
        let resolve;
        let reject;
        let restorationConfig;
        const pending = new Promise((ready, fail) => { resolve = ready; reject = fail; });
        const client = await createRealClient(storage, config => {
            restorationConfig = config;
            assert.equal(config.url, "/api/v1/users/me");
            assert.equal(config.headers.get("authorization"), sessionToken);
            assert.equal(config.timeout, 10000);
            return pending;
        });
        const auth = await mountAuth(client);
        await auth.restore();
        assert.equal(auth.render().isAuthLoading, true);
        const newerProfile = { ...profile, name: "Newer login" };
        storage.setItem("token", "synthetic-newer-token");
        auth.render().login(newerProfile);

        assert.equal(auth.render().user, newerProfile);
        assert.equal(auth.render().isAuthenticated, true);
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().authRestoreError, "");
        assert.equal(restorationConfig.signal.aborted, true);

        if (lateOutcome === "success") resolve({ data: profile });
        else if (lateOutcome === "401") reject(unauthorized(restorationConfig));
        else reject(new axios.AxiosError("Synthetic late failure",
            lateOutcome === "timeout" ? "ECONNABORTED" : "ERR_NETWORK", restorationConfig));
        await new Promise(done => setImmediate(done));

        assert.equal(storage.getItem("token"), "synthetic-newer-token");
        assert.equal(auth.render().user, newerProfile);
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().authRestoreError, "");
        assert.deepEqual(auth.navigations, []);
    });
}

test("authoritative login also supersedes restoration with the same stored token", async () => {
    const storage = storageFixture({ token: sessionToken });
    let reject;
    let config;
    const pending = new Promise((_resolve, fail) => { reject = fail; });
    const client = await createRealClient(storage, request => { config = request; return pending; });
    const auth = await mountAuth(client);
    await auth.restore();
    const newerProfile = { ...profile, name: "Authoritative login" };
    auth.render().login(newerProfile);
    reject(unauthorized(config));
    await new Promise(done => setImmediate(done));
    assert.equal(storage.getItem("token"), sessionToken);
    assert.equal(auth.render().user, newerProfile);
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().authRestoreError, "");
});

test("the restoration deadline ends loading without invalidating the token", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const storage = storageFixture({ token: sessionToken });
    let resolve;
    const pending = new Promise(ready => { resolve = ready; });
    const client = await createClient(storage, () => pending);
    const auth = await mountAuth(client);
    await auth.restore();
    t.mock.timers.tick(9999);
    await new Promise(done => setImmediate(done));
    assert.equal(auth.render().isAuthLoading, true);

    t.mock.timers.tick(1);
    await new Promise(done => setImmediate(done));
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(storage.getItem("token"), sessionToken);
    assert.match(auth.render().authRestoreError, /timed out/);
    assert.equal(client.requests[0].signal.aborted, true);
    assert.equal(client.requests.length, 1);

    resolve({ data: profile });
    await new Promise(done => setImmediate(done));
    assert.equal(auth.render().user, null);
    assert.match(auth.render().authRestoreError, /timed out/);
});

test("a cancelled restoration deadline cannot interfere with a newer login", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const storage = storageFixture({ token: sessionToken });
    const client = await createClient(storage, () => new Promise(() => {}));
    const auth = await mountAuth(client);
    await auth.restore();
    storage.setItem("token", "synthetic-newer-token");
    auth.render().login(profile);
    t.mock.timers.tick(20000);
    await new Promise(done => setImmediate(done));
    assert.equal(auth.render().user, profile);
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().authRestoreError, "");
    assert.equal(storage.getItem("token"), "synthetic-newer-token");
});

for (const status of [undefined, 500]) {
    test(`restoration ${status ?? "network"} failure preserves the token and reports unavailability`, async () => {
        const storage = storageFixture({ token: sessionToken });
        const client = await createClient(storage, async () => { throw apiFailure(status); });
        const auth = await mountAuth(client);
        await auth.restore();
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().isAuthenticated, false);
        assert.equal(storage.getItem("token"), sessionToken);
        assert.match(auth.render().authRestoreError, /Unable to verify/);

        storage.setItem("token", "synthetic-newer-token");
        auth.render().login(profile);
        assert.equal(auth.render().authRestoreError, "");
        assert.equal(auth.render().isAuthenticated, true);
    });
}

test("confirmed restoration 401 clears matching auth without a connectivity error", async () => {
    const storage = storageFixture({ token: sessionToken });
    const client = await createRealClient(storage, async config => { throw unauthorized(config); });
    const auth = await mountAuth(client);
    await auth.restore();
    assert.equal(storage.getItem("token"), null);
    assert.equal(auth.render().user, null);
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().authRestoreError, "");
});

test("effect cleanup cancels old restoration before a fresh restoration runs", async () => {
    const storage = storageFixture({ token: sessionToken });
    let resolve;
    const pending = new Promise(ready => { resolve = ready; });
    let requests = 0;
    const refreshedProfile = { ...profile, name: "Fresh restoration" };
    const client = await createClient(storage, () => ++requests === 1 ? pending : { data: refreshedProfile });
    const auth = await mountAuth(client);
    await auth.restore();
    auth.cleanup();
    auth.render();
    await auth.restore();
    assert.equal(client.requests[0].signal.aborted, true);
    assert.equal(requests, 2);
    assert.equal(auth.render().user, refreshedProfile);
    assert.equal(auth.render().isAuthLoading, false);
    resolve({ data: profile });
    await new Promise(done => setImmediate(done));
    assert.equal(auth.render().user, refreshedProfile);
    auth.cleanup();
});

test("login before the restoration interceptor runs cancels the old request", async () => {
    const storage = storageFixture({ token: sessionToken });
    let adapterCalls = 0;
    const client = await createRealClient(storage, async () => {
        adapterCalls++;
        return { data: profile };
    });
    let entered;
    let release;
    const reached = new Promise(resolve => { entered = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    client.api.interceptors.request.use(async config => {
        entered();
        await gate;
        return config;
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await reached;
    storage.setItem("token", "synthetic-newer-token");
    const newerProfile = { ...profile, name: "Newer login" };
    auth.render().login(newerProfile);
    release();
    await new Promise(done => setImmediate(done));
    assert.equal(adapterCalls, 0);
    assert.equal(storage.getItem("token"), "synthetic-newer-token");
    assert.equal(auth.render().user, newerProfile);
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().authRestoreError, "");
});

function storageDenied() {
    return new DOMException("Synthetic private browser detail", "SecurityError");
}

function denyStorageProperty(globals, name) {
    Object.defineProperty(globals, name, {
        configurable: true,
        get: () => { throw storageDenied(); },
    });
}

for (const denial of ["property access", "removeItem"]) {
    test(`denied legacy localStorage ${denial} cannot break API import or public submissions`, async () => {
        let calls = 0;
        const client = await createRealClient(storageFixture(), async config => {
            calls++;
            assert.equal(config.url, "/contact");
            return { data: { message: "Sent" } };
        }, globals => {
            if (denial === "property access") denyStorageProperty(globals, "localStorage");
            else globals.localStorage.removeItem = () => { throw storageDenied(); };
        });
        assert.equal((await client.api.post("/contact", { message: "Dummy message" })).data.message, "Sent");
        const auth = await mountAuth(client);
        await auth.restore();
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().isAuthenticated, false);
        assert.equal(calls, 1);
    });
}

for (const denial of ["property access", "getItem"]) {
    test(`denied sessionStorage ${denial} allows import and public requests but ends restoration safely`, async () => {
        const storage = storageFixture();
        const calls = [];
        const client = await createRealClient(storage, async config => {
            calls.push(config.url);
            assert.equal(config.headers.get("authorization"), undefined);
            return { data: { token: sessionToken, user: profile } };
        }, globals => {
            if (denial === "property access") denyStorageProperty(globals, "sessionStorage");
            else storage.getItem = () => { throw storageDenied(); };
            globals.console = { log: () => assert.fail("Authentication must not log errors or tokens") };
        });
        const auth = await mountAuth(client);
        await auth.restore();
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().isAuthenticated, false);
        assert.match(auth.render().authRestoreError, /Secure browser session storage is unavailable/);
        assert.deepEqual(calls, []);

        await client.api.post("/contact", { message: "Dummy message" });
        await client.service.signup({ username: "test-student" });
        const form = await mountLogin(client);
        await form.submit();
        assert.deepEqual(form.users, []);
        assert.deepEqual(form.navigations, []);
        assert.match(findElement(form.render(), "p").props.children, /Login to continue/);
        const tree = JSON.stringify(form.render());
        assert.match(tree, /Secure browser session storage is unavailable/);
        assert.doesNotMatch(tree, /Synthetic private browser detail|synthetic-tab-token/);

        await assert.rejects(client.api.get("/interview"), error => {
            assert.equal(error.code, "AUTH_STORAGE_UNAVAILABLE");
            assert.match(error.message, /Secure browser session storage is unavailable/);
            assert.doesNotMatch(error.message, /Synthetic private browser detail/);
            return true;
        });
        assert.deepEqual(calls, ["/contact", "/api/v1/users/register", "/api/v1/users/login"]);
    });
}

for (const denial of ["SecurityError", "silently discarded write", "read after write"]) {
    test(`login does not report success when session persistence fails: ${denial}`, async () => {
        const storage = storageFixture();
        const client = await createRealClient(storage, async () => {
            if (denial === "SecurityError") storage.setItem = () => { throw storageDenied(); };
            if (denial === "silently discarded write") storage.setItem = () => {};
            if (denial === "read after write") storage.getItem = () => { throw storageDenied(); };
            return { data: { token: sessionToken, user: profile } };
        });
        const form = await mountLogin(client);
        await form.submit();
        assert.deepEqual(form.users, []);
        assert.deepEqual(form.navigations, []);
        assert.equal(findElement(form.render(), "button").props.disabled, false);
        assert.match(JSON.stringify(form.render()), /Secure browser session storage is unavailable/);
        assert.doesNotMatch(JSON.stringify(form.render()), /Synthetic private browser detail|synthetic-tab-token/);
    });
}

test("logout handles denied token retrieval, resets its pending flag, and can be retried", async () => {
    const storage = storageFixture({ token: sessionToken });
    let logoutCalls = 0;
    const client = await createRealClient(storage, async config => {
        if (config.url.endsWith("/logout")) logoutCalls++;
        return { data: profile };
    });
    const auth = await mountAuth(client);
    await auth.restore();
    const getItem = storage.getItem;
    storage.getItem = () => { throw storageDenied(); };
    await auth.render().logout();
    assert.equal(logoutCalls, 0);
    assert.equal(auth.render().isAuthenticated, true);
    assert.equal(auth.render().isLoggingOut, false);
    assert.match(auth.render().logoutError, /Secure browser session storage is unavailable.*Logout could not be confirmed/);
    assert.deepEqual(auth.navigations, []);

    storage.getItem = getItem;
    await auth.render().logout();
    assert.equal(logoutCalls, 1);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(storage.getItem("token"), null);
    assert.deepEqual(auth.navigations, ["/"]);
});

for (const denial of ["getItem", "removeItem"]) {
    test(`confirmed logout reports failed browser cleanup when ${denial} is denied`, async () => {
        const storage = storageFixture({ token: sessionToken });
        const getItem = storage.getItem;
        let serverRevoked = false;
        const client = await createRealClient(storage, async config => {
            if (config.url.endsWith("/logout")) {
                assert.equal(config.headers.get("authorization"), sessionToken);
                serverRevoked = true;
                storage[denial] = () => { throw storageDenied(); };
            }
            return { data: profile };
        });
        const auth = await mountAuth(client);
        await auth.restore();
        await auth.render().logout();
        assert.equal(serverRevoked, true);
        assert.equal(getItem("token"), sessionToken);
        assert.equal(auth.render().isLoggingOut, false);
        assert.match(auth.render().logoutError, /server confirmed logout.*browser session cleanup failed/);
        assert.doesNotMatch(auth.render().logoutError, /Synthetic private browser detail/);
        assert.deepEqual(auth.navigations, []);
    });
}

test("logout network failure remains unconfirmed when storage also becomes unavailable", async () => {
    const storage = storageFixture({ token: sessionToken });
    const client = await createRealClient(storage, async config => {
        if (config.url.endsWith("/logout")) {
            storage.getItem = () => { throw storageDenied(); };
            throw new axios.AxiosError("Synthetic network failure", "ERR_NETWORK", config);
        }
        return { data: profile };
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await auth.render().logout();
    assert.equal(auth.render().isAuthenticated, true);
    assert.equal(auth.render().isLoggingOut, false);
    assert.match(auth.render().logoutError, /could not be confirmed.*Secure browser session storage is unavailable/);
    assert.deepEqual(auth.navigations, []);
});

for (const outcome of ["success", "401", "network failure"]) {
    test(`restoration ends safely if storage is denied before a late ${outcome}`, async () => {
        const storage = storageFixture({ token: sessionToken });
        let resolve;
        let reject;
        let config;
        const pending = new Promise((ready, fail) => { resolve = ready; reject = fail; });
        const client = await createRealClient(storage, request => { config = request; return pending; });
        const auth = await mountAuth(client);
        await auth.restore();
        storage.getItem = () => { throw storageDenied(); };
        if (outcome === "success") resolve({ data: profile });
        else reject(outcome === "401" ? unauthorized(config)
            : new axios.AxiosError("Synthetic network failure", "ERR_NETWORK", config));
        await new Promise(done => setImmediate(done));
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().isAuthenticated, false);
        assert.match(auth.render().authRestoreError, /Secure browser session storage is unavailable/);
    });
}

test("restoration timeout still ends loading if storage becomes unavailable", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const storage = storageFixture({ token: sessionToken });
    const client = await createClient(storage, () => new Promise(() => {}));
    const auth = await mountAuth(client);
    await auth.restore();
    storage.getItem = () => { throw storageDenied(); };
    t.mock.timers.tick(10000);
    await new Promise(done => setImmediate(done));
    assert.equal(auth.render().isAuthLoading, false);
    assert.equal(auth.render().isAuthenticated, false);
    assert.match(auth.render().authRestoreError, /Secure browser session storage is unavailable/);
    assert.equal(client.requests[0].signal.aborted, true);
});

test("matching 401 still resets authentication if token removal is denied", async () => {
    const storage = storageFixture({ token: sessionToken });
    const client = await createRealClient(storage, async config => {
        if (config.url.endsWith("/me")) return { data: profile };
        storage.removeItem = () => { throw storageDenied(); };
        throw unauthorized(config);
    });
    const auth = await mountAuth(client);
    await auth.restore();
    await assert.rejects(client.api.post("/interview/7/start"), error => error.response.status === 401);
    assert.equal(storage.getItem("token"), sessionToken);
    assert.equal(auth.render().isAuthenticated, false);
    assert.equal(auth.render().isAuthLoading, false);
    assert.match(auth.render().authRestoreError, /Secure browser session storage is unavailable/);
});

for (const operation of ["logout", "401", "restoration"]) {
    test(`late ${operation} cannot change login B when storage then becomes unreadable`, async () => {
        const storage = storageFixture({ token: sessionToken });
        const getItem = storage.getItem;
        let settle;
        let config;
        const pending = new Promise(resolve => { settle = resolve; });
        const client = await createRealClient(storage, async request => {
            if (operation !== "restoration" && request.url.endsWith("/me")) return { data: profile };
            config = request;
            await pending;
            if (operation === "401") throw unauthorized(config);
            return { data: profile };
        });
        const auth = await mountAuth(client);
        await auth.restore();
        const completion = operation === "logout" ? auth.render().logout()
            : operation === "401" ? assert.rejects(client.api.get("/interview")) : Promise.resolve();
        await new Promise(done => setImmediate(done));
        const newerProfile = { ...profile, name: "Newer login" };
        storage.setItem("token", "synthetic-newer-token");
        auth.render().login(newerProfile);
        storage.getItem = () => { throw storageDenied(); };
        settle();
        await completion;
        await new Promise(done => setImmediate(done));
        assert.equal(getItem("token"), "synthetic-newer-token");
        assert.equal(auth.render().user, newerProfile);
        assert.equal(auth.render().isAuthLoading, false);
        assert.equal(auth.render().authRestoreError, "");
        assert.equal(auth.render().logoutError, "");
        assert.deepEqual(auth.navigations, []);
    });
}
