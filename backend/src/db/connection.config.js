import { isIP } from "node:net";

const invalidConfiguration = () => {
    const error = new Error("Invalid database TLS configuration. Use a PostgreSQL DNS URL with sslmode=require, sslmode=verify-full, or no TLS options.");
    error.code = "INVALID_DATABASE_TLS_CONFIG";
    return error;
};

const isTlsOption = name => /^(ssl|tls)/.test(name) || [
    "uselibpqcompat", "rejectunauthorized", "checkserveridentity", "servername",
    "ca", "cert", "key", "pfx", "passphrase", "minversion", "maxversion",
].includes(name);

export function buildDatabaseConfig(databaseUrl) {
    let url;
    try {
        if (typeof databaseUrl !== "string") throw new Error();
        url = new URL(databaseUrl);
    } catch {
        // Never retain a parsing error: it may contain the original URL.
        throw invalidConfiguration();
    }

    // Require a DNS endpoint so pg supplies the original hostname for SNI and
    // Node's default certificate identity check. Query hosts may override it.
    const hostname = url.hostname;
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash ||
        !hostname || isIP(hostname) || hostname.length > 253 ||
        !hostname.split(".").every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))) {
        throw invalidConfiguration();
    }

    let hasSslMode = false;
    for (const [name, value] of url.searchParams) {
        const normalizedName = name.toLowerCase();
        if (normalizedName === "host" || normalizedName === "hostaddr") throw invalidConfiguration();
        if (!isTlsOption(normalizedName)) continue;

        // Reject duplicates, compatibility flags, unknown TLS controls and
        // certificate paths before pg-connection-string can read any files.
        if (name !== "sslmode" || hasSslMode || !["require", "verify-full"].includes(value)) {
            throw invalidConfiguration();
        }
        hasSslMode = true;
    }

    // The driver's URL parser overrides explicit SSL options. Remove accepted
    // TLS controls only from this copy so the Pool's policy stays authoritative.
    url.searchParams.delete("sslmode");
    return {
        connectionString: url.toString(),
        ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        sslnegotiation: "postgres",
    };
}
