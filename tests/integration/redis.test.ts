import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomBytes } from "node:crypto";
import { readyRedis, redis } from "../../src/lib/redis/client";
import { getOrder, hashToken, insertOrder, orderCredentials, publicOrder, saveOrder, type StoredOrder } from "../../src/lib/acme/store";
import { rateLimit } from "../../src/lib/rate-limit";
import { withLock } from "../../src/lib/redis/locks";

after(async () => { await redis().quit(); });

test("Redis preserves order TTL, protects ownership and refuses expired resurrection", async () => {
  const connection = await readyRedis();
  const { id, token } = orderCredentials();
  const order = { id, ownerHash: hashToken(token), domains: ["example.com"], status: "waiting", expiresAt: Date.now() + 60000, csr: "public CSR" } as StoredOrder;
  await insertOrder(order);
  try {
    assert.equal((await getOrder(id, token)).id, id);
    await assert.rejects(getOrder(id, "f".repeat(64)), /not available/);
    assert.equal("ownerHash" in publicOrder(order), false);
    assert.equal("csr" in publicOrder(order), false);
    const ttl = await connection.ttl(`order:${id}`);
    await saveOrder(order);
    assert.ok((await connection.ttl(`order:${id}`)) <= ttl);
    await connection.pexpireat(`order:${id}`, Date.now() - 1);
    await assert.rejects(getOrder(id, token), /expired/);
    await assert.rejects(saveOrder(order), /expired/);
    assert.equal(await connection.exists(`order:${id}`), 0);
  } finally { await connection.del(`order:${id}`); }
});

test("rate limiting is atomic and includes retry timing", async () => {
  const identity = randomBytes(16).toString("hex");
  const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => rateLimit(identity, "integration", 3, 60)));
  assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 3);
  for (const result of attempts) if (result.status === "rejected") { assert.equal(result.reason.status, 429); assert.ok(result.reason.retryAfter > 0); }
  await (await readyRedis()).del(`rate:integration:${identity}`);
});

test("order locks reject concurrent mutations and release after errors", async () => {
  const key = randomBytes(16).toString("hex");
  await withLock(key, async () => { await assert.rejects(withLock(key, async () => "second"), /already being updated/); });
  await assert.rejects(withLock(key, async () => { throw new Error("test-failure"); }));
  assert.equal(await withLock(key, async () => "released"), "released");
});