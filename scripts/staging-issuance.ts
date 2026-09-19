import assert from "node:assert/strict";
import { createPublicKey, X509Certificate } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { setTimeout as delay } from "node:timers/promises";
import { request } from "@playwright/test";
import { strToU8, unzipSync, zipSync } from "fflate";
import { certificateBundle } from "../src/lib/certificates/bundle";
import type { KeyType, OrderView } from "../src/lib/certificates/types";
import { createKeyMaterial } from "../src/lib/crypto/browser";
import { hasWildcard, parseDomains } from "../src/lib/validation/domains";

async function main() {
  if (process.argv.includes("--help")) {
    console.log("STAGING_DOMAINS=domain-you-control.example TEST_BASE_URL=http://localhost:3000 pnpm test:staging\nOptional: STAGING_METHOD=dns-01|http-01, STAGING_KEY_TYPE=ec256|rsa2048.\nConfigure the running app with an ACME contact email and accepted terms first.\nOnly a server reporting the staging environment is accepted. You must publish the real challenge when prompted.");
    return;
  }
  if (!process.env.STAGING_DOMAINS) throw new Error("Set STAGING_DOMAINS to a domain you control. No ACME request was sent.");
  const domains = parseDomains(process.env.STAGING_DOMAINS.split(","), 10);
  const baseURL = new URL(process.env.TEST_BASE_URL ?? "http://localhost:3000").origin;
  const method = hasWildcard(domains) ? "dns-01" : process.env.STAGING_METHOD ?? "dns-01";
  assert.ok(["dns-01", "http-01"].includes(method), "Invalid STAGING_METHOD");
  const keyType = process.env.STAGING_KEY_TYPE ?? "ec256";
  assert.ok(["ec256", "rsa2048"].includes(keyType), "Invalid STAGING_KEY_TYPE");
  const client = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL }, timeout: 120000 });
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const healthResponse = await client.get("/api/health");
    assert.equal(healthResponse.status(), 200, "The server and Redis must be healthy.");
    assert.equal((await healthResponse.json()).acmeEnvironment, "staging", "Refusing to test a non-staging server. No order was created.");
    const material = await createKeyMaterial(domains, keyType as KeyType);
    async function post(path: string, data: object): Promise<OrderView> {
      const response = await client.post(path, { data });
      const result = await response.json();
      if (!response.ok()) throw new Error(`HTTP ${response.status()}: ${result.error?.message ?? "Request failed"}`);
      assert.equal(result.environment, "staging", "Unexpected server environment");
      return result;
    }
    let order = await post("/api/certificates", { domains, method, keyType, csr: material.csr, acceptedTerms: true });
    console.log(`Created staging order ${order.id}. Publish every challenge below; keep multiple TXT values at the same name.`);
    console.table(order.challenges.map((challenge) => ({ domain: challenge.domain, type: challenge.type, name: challenge.type === "dns-01" ? challenge.recordName : challenge.url, value: challenge.value })));
    await terminal.question("Press Enter once all challenges are publicly accessible: ");
    const deadline = Math.min(order.expiresAt, Date.now() + 10 * 60 * 1000);
    while (Date.now() < deadline) {
      order = await post(`/api/certificates/${order.id}/check`, {});
      if (order.status === "ready") break;
      console.log("Challenges are not all detected yet; checking again in 15 seconds.");
      await delay(15000);
    }
    assert.equal(order.status, "ready", "Challenge detection timed out; no validation was fabricated.");
    order = await post(`/api/certificates/${order.id}/verify`, {});
    while (["verifying", "issuing"].includes(order.status) && Date.now() < deadline) {
      await delay(3000);
      order = await post(`/api/certificates/${order.id}/progress`, {});
      console.log(`Order status: ${order.status}`);
    }
    assert.equal(order.status, "issued", order.error ?? "Issuance did not complete.");
    assert.ok(order.certificate);
    const certificate = new X509Certificate(order.certificate.cert);
    assert.equal(certificate.publicKey.export({ format: "pem", type: "spki" }), createPublicKey(material.privateKey).export({ format: "pem", type: "spki" }), "Certificate must match the client-held private key");
    const files = certificateBundle(material.privateKey, order.certificate, true);
    const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, strToU8(value)])));
    const extracted = unzipSync(zip);
    assert.deepEqual(Object.keys(extracted).sort(), Object.keys(files).sort());
    for (const [name, value] of Object.entries(files)) assert.equal(new TextDecoder().decode(extracted[name]), value);
    const output = join("data", "staging-result", order.id);
    await mkdir(output, { recursive: true, mode: 0o700 });
    for (const [name, content] of Object.entries(files)) await writeFile(join(output, name), content, { mode: 0o600, flag: "wx" });
    await writeFile(join(output, "certificate.zip"), zip, { mode: 0o600, flag: "wx" });
    console.log(`PASS: real staging issuance, matching client key, certificate chain, and ZIP. Private test outputs saved with restricted permissions in ${output}. Never commit them.`);
  } finally {
    terminal.close();
    await client.dispose();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Staging test failed.");
  process.exitCode = 1;
});