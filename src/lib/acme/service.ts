import { X509Certificate } from "node:crypto";
import { crypto as acmeCrypto } from "acme-client";
import { config } from "../../config/env";
import { acmeClient } from "./account";
import { type StoredOrder, type AcmeChallenge, hashToken, insertOrder, orderCredentials, saveOrder } from "./store";
import { challengeLocation, checkChallenge } from "./challenges";
import { validateCsr } from "../crypto/csr";
import { AppError } from "../errors";
import type { KeyType, ValidationMethod } from "../certificates/types";

export async function createCertificateOrder(input: { domains: string[]; method: ValidationMethod; keyType: KeyType; csr: string }) {
  const settings = config();
  await validateCsr(input.csr, input.domains, input.keyType);
  const client = await acmeClient();
  const acmeOrder = await client.createOrder({ identifiers: input.domains.map((value) => ({ type: "dns", value })) });
  const authorizations = await client.getAuthorizations(acmeOrder);
  const selectedChallenges: AcmeChallenge[] = [];
  const challenges = await Promise.all(authorizations.map(async (authorization, index) => {
    const challenge = authorization.challenges.find((candidate) => candidate.type === input.method);
    if (!challenge) throw new AppError("CHALLENGE_UNAVAILABLE", "Let's Encrypt did not offer the requested validation method.", 502);
    selectedChallenges[index] = challenge;
    const domain = `${authorization.wildcard ? "*." : ""}${authorization.identifier.value}`;
    const token = challenge.token ?? "";
    return { id: String(index), domain, type: input.method, token, ...challengeLocation(domain, token, input.method), value: await client.getChallengeKeyAuthorization(challenge), status: authorization.status, ready: authorization.status === "valid" };
  }));
  const credentials = orderCredentials();
  const now = Date.now();
  const order: StoredOrder = { ...input, id: credentials.id, ownerHash: hashToken(credentials.token), acmeOrder, authorizations, selectedChallenges, challenges, status: challenges.every((challenge) => challenge.ready) ? "ready" : "waiting", environment: settings.ACME_ENVIRONMENT, createdAt: now, expiresAt: Math.min(now + settings.ORDER_TTL_SECONDS * 1000, acmeOrder.expires ? new Date(acmeOrder.expires).getTime() : Infinity) };
  await insertOrder(order);
  return { order, token: credentials.token };
}

export async function precheckOrder(order: StoredOrder) {
  if (!["waiting", "ready"].includes(order.status)) return order;
  await Promise.all(order.challenges.map(async (challenge) => {
    try {
      challenge.ready = await checkChallenge(challenge);
      challenge.message = challenge.ready ? "Challenge detected successfully." : challenge.type === "dns-01" ? "Record not detected yet. DNS changes can take several minutes." : "Challenge file not found or its content does not match.";
    } catch (error) {
      challenge.ready = false;
      challenge.message = error instanceof AppError ? error.message : "Challenge check could not be completed. Please try again.";
    }
  }));
  order.status = order.challenges.every((challenge) => challenge.ready) ? "ready" : "waiting";
  await saveOrder(order);
  return order;
}

export async function verifyOrder(order: StoredOrder) {
  if (!["waiting", "ready"].includes(order.status)) return order;
  await precheckOrder(order);
  if (order.status !== "ready") throw new AppError("CHALLENGE_NOT_READY", "Every challenge must be detected before Let's Encrypt verification can begin.");
  order.status = "verifying";
  order.verificationStartedAt = Date.now();
  await saveOrder(order);
  const client = await acmeClient();
  await Promise.all(order.selectedChallenges.map(async (challenge, index) => {
    if (order.authorizations[index].status !== "valid") await client.completeChallenge(challenge);
  }));
  return order;
}

export async function progressOrder(order: StoredOrder) {
  if (!["verifying", "issuing"].includes(order.status)) return order;
  if (Date.now() - (order.verificationStartedAt ?? 0) > 240000) {
    order.status = "failed";
    order.error = "Let's Encrypt did not finish within four minutes. Check the challenge and start a new request.";
    await saveOrder(order);
    return order;
  }
  if (Date.now() - (order.lastProgressAt ?? 0) < 2500) return order;
  order.lastProgressAt = Date.now();
  const client = await acmeClient();
  order.acmeOrder = await client.getOrder(order.acmeOrder);
  order.authorizations = await client.getAuthorizations(order.acmeOrder);
  order.authorizations.forEach((authorization, index) => { order.challenges[index].status = authorization.status; });
  if (order.acmeOrder.status === "invalid" || order.authorizations.some((authorization) => ["invalid", "expired", "revoked", "deactivated"].includes(authorization.status))) {
    order.status = "failed";
    order.error = "Let's Encrypt could not validate this request. Check all public DNS records or challenge files, including IPv6 routing and CAA policy, then create a new order.";
  } else if (order.acmeOrder.status === "ready") {
    order.status = "issuing";
    await saveOrder(order);
    order.acmeOrder = await client.finalizeOrder(order.acmeOrder, order.csr);
  } else if (order.acmeOrder.status === "processing") {
    order.status = "issuing";
  }
  if (order.acmeOrder.status === "valid") {
    const fullchain = await client.getCertificate(order.acmeOrder);
    const certificates = acmeCrypto.splitPemChain(fullchain);
    if (certificates.length < 2) throw new AppError("CERTIFICATE_INCOMPLETE", "The certificate chain returned by the CA is incomplete.", 502);
    const certificate = new X509Certificate(certificates[0]);
    const publicKey = await validateCsr(order.csr, order.domains, order.keyType);
    const actualDomains = acmeCrypto.readCertificateInfo(certificates[0]).domains.altNames;
    if (certificate.publicKey.export({ type: "spki", format: "pem" }).toString() !== publicKey || JSON.stringify([...actualDomains].sort()) !== JSON.stringify([...order.domains].sort())) throw new AppError("CERTIFICATE_MISMATCH", "The issued certificate does not match the request.", 502);
    order.certificate = { cert: certificates[0].trim() + "\n", chain: certificates.slice(1).map((pem) => pem.trim()).join("\n") + "\n", fullchain: fullchain.trim() + "\n", validFrom: new Date(certificate.validFrom).toISOString(), validUntil: new Date(certificate.validTo).toISOString(), issuer: certificate.issuer, fingerprint: certificate.fingerprint256 };
    order.status = "issued";
  }
  await saveOrder(order);
  return order;
}