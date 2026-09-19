import assert from "node:assert/strict";
import test from "node:test";
import { isPublicAddress, validateRedirect, validateTarget } from "../src/lib/network/safe-network";

test("blocks private, metadata, reserved and transition address ranges", () => {
  for (const address of ["127.0.0.1", "127.9.3.4", "0.0.0.0", "10.1.1.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "100.100.100.200", "224.0.0.1", "198.18.0.1", "192.0.2.1", "::", "::1", "fc00::1", "fd00::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:8.8.8.8", "2001:db8::1", "2002:7f00:1::", "64:ff9b::7f00:1", "fe80::1%eth0"]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true, address);
});

test("rejects nonstandard targets and unsafe redirect behavior", () => {
  for (const url of ["ftp://example.com", "https://example.com:8443", "https://a:b@example.com", "http://127.0.0.1", "http://metadata.google.internal"]) assert.throws(() => validateTarget(new URL(url)));
  assert.throws(() => validateRedirect(new URL("https://example.com"), "http://example.com", false));
  assert.throws(() => validateRedirect(new URL("http://example.com"), "http://other.com", true));
  assert.throws(() => validateRedirect(new URL("http://example.com"), "//127.0.0.1", false));
  assert.equal(validateRedirect(new URL("http://example.com"), "https://example.com/file", true).href, "https://example.com/file");
});