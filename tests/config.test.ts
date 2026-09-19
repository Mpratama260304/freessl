import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config/env";
import { site, pageMetadata } from "../src/config/site";

test("FreeSSL branding is shared by the logo and social metadata", () => {
  assert.equal(site.name, "FreeSSL");
  assert.equal(site.logo.monogram, "F");
  assert.equal(site.social.title, "Free SSL Certificate Generator | FreeSSL");
  const metadata = pageMetadata("SSL Checker", "Inspect a certificate", "/ssl-checker");
  assert.deepEqual(metadata.title, { absolute: "SSL Checker | FreeSSL" });
  assert.equal(metadata.openGraph?.title, "SSL Checker | FreeSSL");
  assert.equal(metadata.twitter?.title, "SSL Checker | FreeSSL");
});

test("defaults to Let's Encrypt staging and never accepts other CAs", () => {
  assert.equal(loadConfig({}).directoryUrl, "https://acme-staging-v02.api.letsencrypt.org/directory");
  assert.throws(() => loadConfig({ ACME_ENVIRONMENT: "other" }));
  assert.throws(() => loadConfig({ ACME_ENVIRONMENT: "production" }));
  assert.equal(loadConfig({ ACME_ENVIRONMENT: "production", SITE_URL: "https://ssl.example.com", RATE_LIMIT_SECRET: "a".repeat(32) }).directoryUrl, "https://acme-v02.api.letsencrypt.org/directory");
  assert.throws(() => loadConfig({ MAX_DOMAINS_PER_CERT: "0" }));
});