import "reflect-metadata";
import { createPublicKey } from "node:crypto";
import { Pkcs10CertificateRequest, SubjectAlternativeNameExtension } from "@peculiar/x509";
import { AppError } from "../errors";
import type { KeyType } from "../certificates/types";

export async function validateCsr(pem: string, domains: string[], keyType: KeyType) {
  try {
    if (!/^-----BEGIN CERTIFICATE REQUEST-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE REQUEST-----\s*$/.test(pem) || pem.length > 8192) throw new Error("format");
    const csr = new Pkcs10CertificateRequest(pem);
    const extension = csr.getExtension("2.5.29.17") as SubjectAlternativeNameExtension | null;
    const names = extension?.names.items;
    if (!names?.length || names.some((name) => name.type !== "dns")) throw new Error("SAN");
    const received = names.map((name) => name.value).sort();
    if (JSON.stringify(received) !== JSON.stringify([...domains].sort())) throw new Error("domains");
    const publicKey = createPublicKey(csr.publicKey.toString("pem"));
    const validKey = keyType === "ec256"
      ? publicKey.asymmetricKeyType === "ec" && publicKey.asymmetricKeyDetails?.namedCurve === "prime256v1"
      : publicKey.asymmetricKeyType === "rsa" && publicKey.asymmetricKeyDetails?.modulusLength === 2048;
    if (!validKey || !(await csr.verify())) throw new Error("signature");
    return publicKey.export({ format: "pem", type: "spki" }).toString();
  } catch {
    throw new AppError("INVALID_CSR", "The certificate request must be signed with the selected key and contain exactly the requested domains.");
  }
}