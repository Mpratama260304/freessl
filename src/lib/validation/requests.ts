import { z } from "zod";
import { hasWildcard, normalizeDomain, parseDomains } from "./domains";
import { AppError } from "../errors";

export const createOrderSchema = z.object({
  domains: z.array(z.string().max(2048)).min(1).max(100),
  method: z.enum(["dns-01", "http-01"]),
  keyType: z.enum(["ec256", "rsa2048"]),
  csr: z.string().min(100).max(8192),
  acceptedTerms: z.literal(true),
}).strict();

export function validateOrderInput(value: unknown, maximum: number) {
  const data = createOrderSchema.parse(value);
  try {
    const domains = parseDomains(data.domains, maximum);
    if (hasWildcard(domains) && data.method !== "dns-01") throw new Error("Wildcard certificates require DNS validation.");
    return { domains, method: data.method, keyType: data.keyType, csr: data.csr };
  } catch (error) {
    throw new AppError("INVALID_DOMAIN", error instanceof Error ? error.message : "Enter valid public domains.");
  }
}

export function checkerInput(value: unknown) {
  const data = z.object({ domain: z.string().max(2048) }).strict().parse(value);
  try {
    const domain = normalizeDomain(data.domain);
    if (hasWildcard([domain])) throw new Error("Enter a specific hostname, not a wildcard.");
    return domain;
  } catch (error) {
    throw new AppError("INVALID_DOMAIN", error instanceof Error ? error.message : "Enter a valid public domain.");
  }
}