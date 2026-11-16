import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import * as router from "react-router-dom";
import { transformWithOxc } from "vite";

// Compile explicit JSX files in memory; never start Vite or load app config.
async function compile(path, filename) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    return (await transformWithOxc(source, filename, {
        jsx: { runtime: "automatic" },
    })).code;
}

async function loadModule(code, dependencies) {
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const exports = dependencies[specifier];
        assert.ok(exports, `Unexpected import: ${specifier}`);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

let auth;
let renderedPages;
let redirects;
// Real MemoryRouter, Routes, Route and Outlet resolve the actual App route tree.
// Capture Navigate's intent during server rendering instead of needing a DOM.
const routerExports = {
    ...router,
    Navigate: props => { redirects.push(props); return null; },
};
const { default: ProtectedRoute } = await loadModule(
    await compile("../src/components/ProtectedRoute.jsx", "ProtectedRoute.jsx"),
    {
        "react/jsx-runtime": jsxRuntime,
        "react-router-dom": routerExports,
        "../hooks/useAuth.jsx": { default: () => auth },
    }
);
const dependencies = {
    "react/jsx-runtime": jsxRuntime,
    "react-router-dom": routerExports,
    "./components/ProtectedRoute.jsx": { default: ProtectedRoute },
};
for (const [path, name] of [
    ["../src/pages/Home.jsx", "Home"],
    ["../src/pages/Login.jsx", "Login"],
    ["./pages/Signup.jsx", "Signup"],
    ["./pages/Dashboard.jsx", "Dashboard"],
    ["./pages/Interview.jsx", "Interview"],
    ["./pages/InterviewQuestions.jsx", "InterviewQuestions"],
    ["./pages/InterviewResult.jsx", "InterviewResult"],
    ["./pages/TestVoice.jsx", "TestVoice"],
    ["./pages/Aboutai.jsx", "About"],
    ["./pages/Contactai.jsx", "Contact"],
]) {
    dependencies[path] = { default: () => {
        renderedPages.push(name);
        return createElement("div", null, name);
    } };
}
const { default: App } = await loadModule(await compile("../src/App.jsx", "App.jsx"), dependencies);

function render(path, state) {
    auth = state;
    renderedPages = [];
    redirects = [];
    return renderToString(createElement(router.MemoryRouter, { initialEntries: [path] }, createElement(App)));
}

for (const [path, page] of [
    ["/dashboard", "Dashboard"],
    ["/interview/7", "Interview"],
    ["/interview/7/questions", "InterviewQuestions"],
    ["/interview/7/result", "InterviewResult"],
]) {
    test(`${path} waits for authentication without mounting private content`, () => {
        const html = render(path, { isAuthLoading: true, isAuthenticated: false });
        assert.match(html, /role="status"/);
        assert.match(html, /Checking session/);
        assert.deepEqual(renderedPages, []);
        assert.deepEqual(redirects, []);
    });

    test(`${path} redirects unauthenticated visitors to login`, () => {
        render(path, { isAuthLoading: false, isAuthenticated: false });
        assert.deepEqual(renderedPages, []);
        assert.equal(redirects.length, 1);
        assert.equal(redirects[0].to, "/login");
        assert.equal(redirects[0].replace, true);
    });

    test(`${path} renders for an authenticated student`, () => {
        render(path, { isAuthLoading: false, isAuthenticated: true });
        assert.deepEqual(renderedPages, [page]);
        assert.deepEqual(redirects, []);
    });

    test(`${path} reports restoration unavailability without claiming invalid credentials`, () => {
        const html = render(path, {
            isAuthLoading: false, isAuthenticated: false,
            authRestoreError: "Unable to verify your session. Refresh to try again.",
        });
        assert.match(html, /role="alert"/);
        assert.match(html, /Refresh to try again/);
        assert.deepEqual(renderedPages, []);
        assert.deepEqual(redirects, []);
    });
}

for (const [path, page] of [
    ["/", "Home"], ["/login", "Login"], ["/signup", "Signup"],
    ["/about", "About"], ["/contact", "Contact"], ["/voice", "TestVoice"],
]) {
    test(`${path} stays public both during and after authentication restoration`, () => {
        for (const isAuthLoading of [true, false]) {
            render(path, { isAuthLoading, isAuthenticated: false });
            assert.deepEqual(renderedPages, [page]);
            assert.deepEqual(redirects, []);
        }
    });
}
