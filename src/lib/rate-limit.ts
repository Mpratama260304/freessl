import { createHmac, randomBytes } from "node:crypto";
import { readyRedis } from "./redis/client";
import { config } from "../config/env";
import { AppError } from "./errors";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

const developmentSecret = randomBytes(32).toString("hex");

export function clientIdentity(headers: Headers): string {
  const settings = config();
  let address = settings.TRUST_PROXY === "true" ? headers.get("x-real-ip") ?? "unknown" : "direct";
  if (address !== "direct" && !isIP(address)) address = "unknown";
  if (isIP(address) === 6) address = ipaddr.parse(address).toByteArray().slice(0, 8).join(".");
  return createHmac("sha256", settings.RATE_LIMIT_SECRET ?? developmentSecret).update(address).digest("hex");
}

export async function rateLimit(identity: string, operation: string, limit: number, windowSeconds: number): Promise<void> {
  const connection = await readyRedis();
  const result = await connection.eval("local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return {count, redis.call('TTL', KEYS[1])}", 1, `rate:${operation}:${identity}`, windowSeconds) as [number, number];
  if (result[0] > limit) throw new AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429, Math.max(1, result[1]));
}