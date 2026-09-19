import { Redis } from "ioredis";
import { config } from "../../config/env";

const globalRedis = globalThis as unknown as { certlaneRedis?: Redis };

export function redis(): Redis {
  if (!globalRedis.certlaneRedis) {
    globalRedis.certlaneRedis = new Redis(config().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000, commandTimeout: 5000, enableOfflineQueue: false });
    globalRedis.certlaneRedis.on("error", () => {});
  }
  return globalRedis.certlaneRedis;
}

export async function readyRedis(): Promise<Redis> {
  const connection = redis();
  if (connection.status === "wait") await connection.connect();
  if (connection.status !== "ready") throw new Error("Redis unavailable");
  return connection;
}