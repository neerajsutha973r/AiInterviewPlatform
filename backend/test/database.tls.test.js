import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildDatabaseConfig } from "../src/db/connection.config.js";

// Read only installed driver source. Evaluate it with synthetic environment
// objects and blocked file/network access, without importing the app or dotenv.
const [parserSource, parametersSource, connectionSource] = await Promise.all([
    "../node_modules/pg-connection-string/index.js",
    "../node_modules/pg/lib/connection-parameters.js",
    "../node_modules/pg/lib/connection.js",
].map(path => readFile(new URL(path, import.meta.url), "utf8")));

function loadCommonJs(source, require, globals = {}) {
    const module = { exports: {} };
    vm.runInNewContext(source, { module, require, ...globals });
    return module.exports;
}

function driverHarness() {
    let fileAccessAttempts = 0;
    const parser = loadCommonJs(parserSource, () => {
        fileAccessAttempts++;
        throw new Error("Driver filesystem access is blocked in these tests");
    }, {
        URL,
        process: { emitWarning: () => assert.fail("TLS controls reached the driver parser") },
    });
    const Parameters = loadCommonJs(parametersSource, name => {
        if (name === "pg-connection-string") return parser;
        if (name === "./defaults") return { ssl: false, port: 5432 };
        if (name === "dns") return { lookup: () => assert.fail("DNS access is blocked") };
        assert.fail("Unexpected driver dependency");
    }, {
        process: { env: { PGSSLMODE: "disable", PGSSLNEGOTIATION: "direct" } },
    });
    return {
        resolve: input => new Parameters(buildDatabaseConfig(input)),
        fileAccessAttempts: () => fileAccessAttempts,
    };
}

const fixtureUrl = "postgresql://dummy-user:dummy-password@ep-dummy-pooler.example.test:5432/dummy";
const errorMessage = "Invalid database TLS configuration. Use a PostgreSQL DNS URL with sslmode=require, sslmode=verify-full, or no TLS options.";
function safeConfigurationError(error) {
    assert.equal(error.code, "INVALID_DATABASE_TLS_CONFIG");
    assert.equal(error.message, errorMessage);
    assert.equal(error.cause, undefined);
    assert.equal(error.input, undefined);
    assert.doesNotMatch(error.stack, /dummy-password|ep-dummy-pooler|never-open/);
    return true;
}

for (const protocol of ["postgresql:", "postgres:"]) {
    for (const [description, query] of [
        ["absent TLS options", ""],
        ["require", "?sslmode=require"],
        ["verify-full", "?sslmode=verify-full"],
    ]) {
        test(`${protocol} ${description} retains strict TLS after the installed driver parser`, () => {
            const driver = driverHarness();
            const input = fixtureUrl.replace("postgresql:", protocol) + query;
            const options = buildDatabaseConfig(input);
            const effective = driver.resolve(input);
            assert.equal(new URL(options.connectionString).searchParams.has("sslmode"), false);
            assert.equal(effective.ssl.rejectUnauthorized, true);
            assert.equal(effective.ssl.minVersion, "TLSv1.2");
            assert.equal(effective.ssl.checkServerIdentity, undefined);
            assert.equal(effective.ssl.ca, undefined);
            assert.equal(effective.sslnegotiation, "postgres");
            assert.equal(effective.host, "ep-dummy-pooler.example.test");
            assert.equal(effective.port, 5432);
            assert.equal(driver.fileAccessAttempts(), 0);
        });
    }
}

test("normalization preserves dummy credentials, database and unrelated URL options", () => {
    const input = new URL(fixtureUrl);
    input.username = "dummy@user";
    input.password = encodeURIComponent("dummy:p@ss/%word");
    input.searchParams.set("application_name", "Interview Test");
    input.searchParams.set("channel_binding", "require");
    input.searchParams.set("sslmode", "require");
    const original = input.toString();
    const options = buildDatabaseConfig(original);
    const output = new URL(options.connectionString);
    const effective = driverHarness().resolve(original);
    assert.equal(input.toString(), original);
    assert.equal(output.searchParams.get("application_name"), "Interview Test");
    assert.equal(output.searchParams.get("channel_binding"), "require");
    assert.equal(effective.application_name, "Interview Test");
    assert.equal(effective.user, "dummy@user");
    assert.equal(effective.password, "dummy:p@ss/%word");
    assert.equal(effective.database, "dummy");
});

for (const [description, query] of [
    ["disable", "sslmode=disable"],
    ["no-verify", "sslmode=no-verify"],
    ["prefer", "sslmode=prefer"],
    ["verify-ca", "sslmode=verify-ca"],
    ["unknown mode", "sslmode=unknown"],
    ["empty mode", "sslmode="],
    ["unsupported mode casing", "sslmode=REQUIRE"],
    ["SSL disabled", "ssl=0"],
    ["alternate SSL disable", "ssl=false"],
    ["SSL verification bypass", "ssl=no-verify"],
    ["unsupported SSL enable", "ssl=true"],
    ["libpq-compatible require", "sslmode=require&uselibpqcompat=true"],
    ["unsupported compatibility flag", "sslmode=verify-full&uselibpqcompat=false"],
    ["libpq-compatible verify-full", "sslmode=verify-full&uselibpqcompat=true"],
    ["conflicting SSL controls", "sslmode=verify-full&ssl=0"],
    ["duplicate equal modes", "sslmode=require&sslmode=require"],
    ["duplicate conflicting modes", "sslmode=require&sslmode=disable"],
    ["duplicate accepted modes", "sslmode=require&sslmode=verify-full"],
    ["encoded duplicate key", "sslmode=require&%73slmode=verify-full"],
    ["mixed-case duplicate key", "sslmode=require&SSLMode=verify-full"],
    ["unsupported key casing", "SSLMODE=verify-full"],
    ["direct SSL negotiation", "sslnegotiation=direct"],
    ["unsupported negotiation control", "sslnegotiation=postgres"],
    ["unknown SSL control", "ssl_unknown=anything"],
    ["unknown TLS control", "tls_unknown=anything"],
    ["verification override", "rejectUnauthorized=false"],
    ["identity override", "checkServerIdentity=anything"],
    ["SNI override", "servername=other.example.test"],
    ["minimum TLS override", "minVersion=TLSv1"],
    ["maximum TLS override", "maxVersion=TLSv1"],
    ["hostname override", "host=other.example.test"],
    ["host address override", "hostaddr=127.0.0.1"],
    ["CA file", "sslrootcert=/never-open/dummy-ca.pem"],
    ["certificate file", "sslcert=/never-open/dummy-cert.pem"],
    ["key file", "sslkey=/never-open/dummy-key.pem"],
    ["encoded certificate key", "%73slrootcert=/never-open/dummy-ca.pem"],
    ["certificate with accepted mode", "sslmode=verify-full&sslrootcert=/never-open/dummy-ca.pem"],
    ["empty certificate parameter", "sslcert="],
    ["unrecognized CA control", "ca=/never-open/dummy-ca.pem"],
    ["unrecognized certificate control", "cert=/never-open/dummy-cert.pem"],
    ["unrecognized key control", "key=/never-open/dummy-key.pem"],
    ["unrecognized bundle control", "pfx=/never-open/dummy-bundle.pfx"],
    ["certificate password control", "passphrase=dummy-password"],
]) {
    test(`rejects ${description} before driver TLS or certificate-file parsing`, () => {
        const driver = driverHarness();
        assert.throws(() => driver.resolve(`${fixtureUrl}?${query}`), safeConfigurationError);
        assert.equal(driver.fileAccessAttempts(), 0);
    });
}

for (const [description, input] of [
    ["missing URL", undefined],
    ["null URL", null],
    ["non-string URL", {}],
    ["malformed URL", "postgresql://dummy-user:dummy-password@"],
    ["wrong protocol", "https://ep-dummy.example.test/dummy"],
    ["missing hostname", "postgresql:///dummy"],
    ["socket hostname", "postgresql://%2Fnever-open/dummy"],
    ["IPv4 endpoint", "postgresql://dummy:dummy@127.0.0.1/dummy"],
    ["IPv6 endpoint", "postgresql://dummy:dummy@[::1]/dummy"],
    ["URL fragment", `${fixtureUrl}#dummy-password`],
]) {
    test(`rejects ${description} with a fixed error containing no input or cause`, () => {
        assert.throws(() => buildDatabaseConfig(input), safeConfigurationError);
    });
}

test("the filesystem guard also blocks the original parser's certificate-file branch", () => {
    let attempts = 0;
    const parser = loadCommonJs(parserSource, name => {
        assert.equal(name, "fs");
        return { readFileSync: () => { attempts++; throw new Error("Blocked dummy certificate read"); } };
    }, { URL });
    assert.throws(() => parser(`${fixtureUrl}?sslrootcert=/never-open/dummy-ca.pem`), /Blocked dummy certificate read/);
    assert.equal(attempts, 1); // The mock was called; the filesystem was not.
});

for (const hostname of ["ep-dummy.example.test", "ep-dummy-pooler.example.test"]) {
    test(`installed pg forwards strict TLS and the original ${hostname.includes("pooler") ? "pooled" : "direct"} DNS hostname to its TLS stream`, () => {
        let tlsOptions;
        const Connection = loadCommonJs(connectionSource, name => {
            if (name === "events") return { EventEmitter };
            if (name === "net") return { isIP };
            if (name === "pg-protocol") return {
                parse: () => {},
                serialize: { flush: () => null, sync: () => null, end: () => null },
            };
            if (name === "./stream") return {
                getStream: () => assert.fail("Network access is blocked"),
                getSecureStream: options => { tlsOptions = options; return new EventEmitter(); },
            };
            assert.fail("Unexpected connection dependency");
        });
        const input = new URL(fixtureUrl);
        input.hostname = hostname;
        input.searchParams.set("sslmode", "require");
        const effective = driverHarness().resolve(input.toString());
        const socket = new EventEmitter();
        const connection = new Connection({
            stream: socket, ssl: effective.ssl, sslNegotiation: effective.sslnegotiation,
        });
        connection.upgradeToSSL(effective.host, () => assert.fail("Unexpected stream error"));
        assert.equal(tlsOptions.socket, socket);
        assert.equal(tlsOptions.servername, hostname);
        assert.equal(tlsOptions.rejectUnauthorized, true);
        assert.equal(tlsOptions.minVersion, "TLSv1.2");
        assert.equal(tlsOptions.checkServerIdentity, undefined);
    });
}

for (const valid of [true, false]) {
    test(`connection module ${valid ? "wires strict Pool configuration and safe logging" : "rejects unsafe TLS before constructing a Pool"}`, () => {
        // A subprocess supplies ONLY synthetic environment values. Mock pg and
        // dotenv before importing the real connection module: no .env reads,
        // database connections, or changes to the parent environment occur.
        const script = `
            import assert from 'node:assert/strict';
            import { mock } from 'node:test';
            let poolCalls = 0;
            let dotenvCalls = 0;
            let poolOptions;
            const handlers = {};
            mock.module('dotenv', { defaultExport: { config: () => { dotenvCalls++; } } });
            mock.module('pg', { defaultExport: { Pool: class {
                constructor(options) { poolCalls++; poolOptions = options; }
                on(event, callback) { handlers[event] = callback; }
            } } });
            if (${valid}) {
                await import('./src/db/connection.js');
                assert.equal(poolCalls, 1);
                assert.equal(dotenvCalls, 1);
                assert.equal(poolOptions.ssl.rejectUnauthorized, true);
                assert.equal(poolOptions.ssl.minVersion, 'TLSv1.2');
                assert.equal(poolOptions.ssl.checkServerIdentity, undefined);
                assert.equal(new URL(poolOptions.connectionString).searchParams.has('sslmode'), false);
                let logged;
                console.error = (...args) => { logged = args; };
                handlers.error(new Error('dummy-password private driver diagnostics'));
                assert.deepEqual(logged, ['Database connection error.']);
            } else {
                await assert.rejects(import('./src/db/connection.js'), error => {
                    assert.equal(error.code, 'INVALID_DATABASE_TLS_CONFIG');
                    assert.equal(error.cause, undefined);
                    assert.doesNotMatch(error.message, /dummy-password|ep-dummy/);
                    return true;
                });
                assert.equal(poolCalls, 0);
            }
        `;
        const result = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--input-type=module", "-e", script], {
            cwd: fileURLToPath(new URL("..", import.meta.url)),
            env: {
                DATABASE_URL: `${fixtureUrl}?sslmode=${valid ? "require" : "disable"}`,
                NODE_ENV: "test", SystemRoot: "C:\\Windows",
            },
            encoding: "utf8", windowsHide: true, timeout: 10_000,
        });
        assert.equal(result.error, undefined);
        assert.equal(result.status, 0, result.stderr);
    });
}
