import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey, createHash } from "node:crypto";
import test from "node:test";
import { Client, crypto as acmeCrypto } from "acme-client";
import { createKeyMaterial } from "../src/lib/crypto/browser";
import { validateCsr } from "../src/lib/crypto/csr";
import { challengeLocation } from "../src/lib/acme/challenges";

for (const type of ["ec256", "rsa2048"] as const) {
  test(`${type} browser key signs a valid CSR with every SAN`, async () => {
    const domains = ["example.com", "*.example.com", "www.example.com"];
    const { csr, privateKey } = await createKeyMaterial(domains, type);
    const publicKey = await validateCsr(csr, domains, type);
    assert.equal(createPublicKey(createPrivateKey(privateKey)).export({ format: "pem", type: "spki" }).toString(), publicKey);
    await assert.rejects(validateCsr(csr, ["other.com"], type));
    await assert.rejects(validateCsr(privateKey, domains, type));
    await assert.rejects(validateCsr(csr, domains, type === "ec256" ? "rsa2048" : "ec256"));
  });
}

test("DNS-01 uses RFC8555 SHA-256 values and preserves multiple challenges", async () => {
  const accountKey = await acmeCrypto.createPrivateEcdsaKey("P-256");
  const client = new Client({ directoryUrl: "https://acme-staging-v02.api.letsencrypt.org/directory", accountKey });
  const token = "test-token-1";
  const value = await client.getChallengeKeyAuthorization({ type: "dns-01", status: "pending", url: "https://acme-staging-v02.api.letsencrypt.org/chall/test", token });
  const thumbprint = createHash("sha256").update(JSON.stringify(acmeCrypto.getJwk(accountKey))).digest("base64url");
  assert.equal(value, createHash("sha256").update(`${token}.${thumbprint}`).digest("base64url"));
  assert.equal(challengeLocation("example.com", token, "dns-01").recordName, challengeLocation("*.example.com", "test-token-2", "dns-01").recordName);
  assert.equal(challengeLocation("example.com", token, "http-01").url, `http://example.com/.well-known/acme-challenge/${token}`);
  assert.throws(() => challengeLocation("example.com", "../private", "http-01"));
});