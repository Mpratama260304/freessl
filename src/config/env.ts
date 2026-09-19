import { z } from "zod";

const schema = z.object({
  ACME_ENVIRONMENT: z.enum(["staging", "production"]).default("staging"),
  ACME_ACCOUNT_EMAIL: z.email().optional(),
  ACME_TERMS_AGREED: z.enum(["true", "false"]).default("false"),
  ACME_DATA_DIR: z.string().default("./data/acme"),
  REDIS_URL: z.url().default("redis://127.0.0.1:6379"),
  SITE_URL: z.url().default("http://localhost:3000"),
  ORDER_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(1800),
  MAX_DOMAINS_PER_CERT: z.coerce.number().int().min(1).max(100).default(10),
  MAX_ORDER_PER_IP_PER_HOUR: z.coerce.number().int().min(1).max(100).default(5),
  MAX_ORDERS_GLOBAL_PER_HOUR: z.coerce.number().int().min(1).default(100),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  RATE_LIMIT_SECRET: z.string().min(32).optional(),
});

export function loadConfig(input: Record<string, string | undefined> = process.env) {
  const parsed = schema.parse(input);
  const site = new URL(parsed.SITE_URL);
  if (!["http:", "https:"].includes(site.protocol) || site.username || site.password || site.pathname !== "/") throw new Error("SITE_URL must be an HTTP(S) origin.");
  if (parsed.ACME_ENVIRONMENT === "production" && (site.protocol !== "https:" || !parsed.RATE_LIMIT_SECRET)) throw new Error("Production issuance requires HTTPS and RATE_LIMIT_SECRET.");
  return { ...parsed, directoryUrl: parsed.ACME_ENVIRONMENT === "production" ? "https://acme-v02.api.letsencrypt.org/directory" : "https://acme-staging-v02.api.letsencrypt.org/directory" };
}

export const config = () => loadConfig();