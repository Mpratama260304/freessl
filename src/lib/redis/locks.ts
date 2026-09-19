import { randomBytes } from "node:crypto";
import { readyRedis } from "./client";
import { AppError } from "../errors";

export async function withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const connection = await readyRedis();
  const token = randomBytes(24).toString("hex");
  if (!(await connection.set(`lock:${key}`, token, "EX", 150, "NX"))) throw new AppError("ORDER_BUSY", "This order is already being updated. Please wait a moment.", 409);
  try {
    return await operation();
  } finally {
    await connection.eval("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, `lock:${key}`, token);
  }
}