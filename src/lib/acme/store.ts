import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Authorization, Order } from "acme-client";
import type { OrderView } from "../certificates/types";
import { readyRedis } from "../redis/client";
import { AppError } from "../errors";

export type AcmeChallenge = NonNullable<Authorization["challenges"]>[number];
export interface StoredOrder extends OrderView {
  ownerHash: string;
  csr: string;
  acmeOrder: Order;
  authorizations: Authorization[];
  selectedChallenges: AcmeChallenge[];
  verificationStartedAt?: number;
  lastProgressAt?: number;
}

export const orderCredentials = () => ({ id: `ssl_order_${randomBytes(16).toString("hex")}`, token: randomBytes(32).toString("hex") });
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const expired = (order: { expiresAt: number }, now = Date.now()) => order.expiresAt <= now;

export async function insertOrder(order: StoredOrder) {
  const ttl = Math.floor((order.expiresAt - Date.now()) / 1000);
  if (ttl < 1) throw new AppError("ORDER_EXPIRED", "This certificate order has expired. Start a new request.", 410);
  await (await readyRedis()).set(`order:${order.id}`, JSON.stringify(order), "EX", ttl, "NX");
}

export async function saveOrder(order: StoredOrder) {
  if (expired(order) || !(await (await readyRedis()).set(`order:${order.id}`, JSON.stringify(order), "KEEPTTL", "XX"))) throw new AppError("ORDER_EXPIRED", "This certificate order has expired. Start a new request.", 410);
}

export async function getOrder(id: string, token: string | undefined): Promise<StoredOrder> {
  if (!/^ssl_order_[a-f0-9]{32}$/.test(id) || !token || !/^[a-f0-9]{64}$/.test(token)) throw new AppError("ORDER_NOT_FOUND", "This order is not available in this browser.", 404);
  const stored = await (await readyRedis()).get(`order:${id}`);
  if (!stored) throw new AppError("ORDER_EXPIRED", "This certificate order has expired. Start a new request.", 410);
  const order = JSON.parse(stored) as StoredOrder;
  if (!timingSafeEqual(Buffer.from(order.ownerHash, "hex"), Buffer.from(hashToken(token), "hex"))) throw new AppError("ORDER_NOT_FOUND", "This order is not available in this browser.", 404);
  if (expired(order)) throw new AppError("ORDER_EXPIRED", "This certificate order has expired. Start a new request.", 410);
  return order;
}

export function publicOrder(order: StoredOrder): OrderView {
  return { id: order.id, domains: order.domains, method: order.method, keyType: order.keyType, environment: order.environment, status: order.status, createdAt: order.createdAt, expiresAt: order.expiresAt, challenges: order.challenges, certificate: order.certificate, error: order.error };
}