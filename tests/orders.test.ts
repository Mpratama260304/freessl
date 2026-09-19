import assert from "node:assert/strict";
import test from "node:test";
import { expired, orderCredentials } from "../src/lib/acme/store";
import { validateOrderInput, checkerInput } from "../src/lib/validation/requests";
import { assertOrigin } from "../src/lib/api";
import { checkChallenge } from "../src/lib/acme/challenges";

test("order expiration uses an absolute boundary and identifiers have high entropy", () => {
  assert.equal(expired({ expiresAt: 100 }, 99), false);
  assert.equal(expired({ expiresAt: 100 }, 100), true);
  const first = orderCredentials();
  assert.match(first.id, /^ssl_order_[a-f0-9]{32}$/);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.id, orderCredentials().id);
});

test("server rejects wildcard HTTP, hidden private keys and checker wildcards", () => {
  assert.throws(() => validateOrderInput({ domains: ["*.example.com"], method: "http-01", keyType: "ec256", csr: "a".repeat(200), acceptedTerms: true }, 10), /Wildcard/);
  assert.throws(() => validateOrderInput({ domains: ["example.com"], method: "dns-01", keyType: "ec256", csr: "a".repeat(200), acceptedTerms: true, privateKey: "must-not-arrive" }, 10));
  assert.throws(() => checkerInput({ domain: "*.example.com" }));
});

test("mutations require the exact configured origin", () => {
  assert.throws(() => assertOrigin(new Request("http://localhost:3000/api", { headers: { origin: "https://evil.example", "content-type": "application/json" } })));
  assert.doesNotThrow(() => assertOrigin(new Request("http://localhost:3000/api", { headers: { origin: "http://localhost:3000", "content-type": "application/json" } })));
});

test("production mutations accept FreeSSL behind a proxy without weakening origin checks", (context) => {
  const environment = process.env;
  context.after(() => { process.env = environment; });
  process.env = { ...environment, NODE_ENV: "production", ACME_ENVIRONMENT: "staging" };
  delete process.env.SITE_URL;

  const request = (headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/certificates", {
    method: "POST",
    headers: { origin: "https://freessl.run", "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
  });
  assert.doesNotThrow(() => assertOrigin(request()));
  const rejectedHeaders: Record<string, string>[] = [
    { origin: "https://evil.example" },
    { origin: "http://freessl.run" },
    { origin: "http://localhost:3000" },
    { origin: "null" },
    { "sec-fetch-site": "cross-site" },
    { origin: "https://evil.example", host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
  ];
  for (const headers of rejectedHeaders) {
    assert.throws(() => assertOrigin(request(headers)), { code: "ORIGIN_DENIED", status: 403 });
  }
  const withoutOrigin = request();
  withoutOrigin.headers.delete("origin");
  assert.throws(() => assertOrigin(withoutOrigin), { code: "ORIGIN_DENIED", status: 403 });

  process.env.SITE_URL = "https://ssl.example.com";
  assert.doesNotThrow(() => assertOrigin(request({ origin: "https://ssl.example.com" })));
  assert.throws(() => assertOrigin(request()), { code: "ORIGIN_DENIED", status: 403 });
});

test("valid ACME authorizations do not require the old DNS record or HTTP file", async () => {
  for (const type of ["dns-01", "http-01"] as const) {
    assert.equal(await checkChallenge({ id: "0", domain: "example.com", type, token: "old-token", recordName: "_acme-challenge.example.invalid", url: "http://127.0.0.1/.well-known/acme-challenge/old-token", value: "old-value", status: "valid", ready: false }), true);
  }
});