import "reflect-metadata";
import { Pkcs10CertificateRequestGenerator, SubjectAlternativeNameExtension } from "@peculiar/x509";
import type { KeyType } from "../certificates/types";

export async function createKeyMaterial(domains: string[], keyType: KeyType) {
  if (!globalThis.crypto?.subtle) throw new Error("Key generation requires HTTPS or localhost in a modern browser.");
  const algorithm = keyType === "ec256"
    ? { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" }
    : { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
  const keys = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]) as CryptoKeyPair;
  const request = await Pkcs10CertificateRequestGenerator.create({
    name: domains[0].length <= 64 ? `CN=${domains[0]}` : undefined,
    keys,
    signingAlgorithm: algorithm,
    extensions: [new SubjectAlternativeNameExtension(domains.map((value) => ({ type: "dns" as const, value })))],
  }, crypto);
  const exported = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey));
  const base64 = btoa(String.fromCharCode(...exported));
  exported.fill(0);
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;
  return { privateKey, csr: request.toString("pem") };
}