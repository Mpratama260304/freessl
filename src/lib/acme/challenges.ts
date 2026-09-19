import { Resolver } from "node:dns/promises";
import type { ChallengeView, ValidationMethod } from "../certificates/types";
import { safeRequest } from "../network/safe-network";

export function challengeLocation(domain: string, token: string, type: ValidationMethod) {
  const hostname = domain.replace(/^\*\./, "");
  if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error("Invalid ACME token");
  return { recordName: `_acme-challenge.${hostname}`, url: type === "http-01" ? `http://${hostname}/.well-known/acme-challenge/${token}` : "" };
}

export async function dnsReady(name: string, value: string): Promise<boolean> {
  const results = await Promise.allSettled([undefined, "1.1.1.1", "8.8.8.8"].map(async (server) => {
    const resolver = new Resolver({ timeout: 2500, tries: 1 });
    if (server) resolver.setServers([server]);
    const records = await resolver.resolveTxt(name);
    return records.some((parts) => parts.join("") === value);
  }));
  return results.some((result) => result.status === "fulfilled" && result.value);
}

export async function checkChallenge(challenge: ChallengeView): Promise<boolean> {
  if (challenge.status === "valid") return true;
  if (challenge.type === "dns-01") return dnsReady(challenge.recordName, challenge.value);
  const response = await safeRequest(new URL(challenge.url), { redirects: 3, sameHost: true });
  return response.status === 200 && response.body.trimEnd() === challenge.value;
}