import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDomain, parseDomains, hasWildcard } from "../src/lib/validation/domains.ts";

test("normalizes hostnames, URLs and international domain names", () => {
  assert.equal(normalizeDomain(" HTTPS://Example.COM/test?q=yes "), "example.com");
  assert.equal(normalizeDomain("www.example.com."), "www.example.com");
  assert.equal(normalizeDomain("https://xn--bcher-kva.de"), "xn--bcher-kva.de");
  assert.equal(normalizeDomain("*.Example.com"), "*.example.com");
});

test("rejects IPs, local names, ports, credentials and malformed domains", () => {
  for (const input of ["localhost", "127.0.0.1", "10.0.0.1", "[::1]", "example.com:443", "https://example.com:443", "https://user:pass@example.com", "example.com/path", "example.com?q=a", "*.*.example.com", "foo.*.com", "-foo.com", "foo.invalid", "foo.local", "foo.123", "https://example.com\\@127.0.0.1", "foo..com"]) {
    assert.throws(() => normalizeDomain(input), input);
  }
});

test("SAN lists normalize, deduplicate and enforce bounds", () => {
  assert.deepEqual(parseDomains(["Example.com", "example.com", "*.example.com", "www.example.com"], 10), ["example.com", "*.example.com", "www.example.com"]);
  assert.throws(() => parseDomains([], 10));
  assert.throws(() => parseDomains(["a.com", "b.com"], 1));
  assert.equal(hasWildcard(["example.com", "*.example.com"]), true);
  assert.equal(hasWildcard(["www.example.com"]), false);
});