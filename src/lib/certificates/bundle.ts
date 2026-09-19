import type { CertificateFiles } from "./types";

export function certificateBundle(privateKey: string, certificate: CertificateFiles, staging: boolean): Record<string, string> {
  return {
    "privkey.pem": privateKey,
    "cert.pem": certificate.cert,
    "chain.pem": certificate.chain,
    "fullchain.pem": certificate.fullchain,
    "README.txt": `${staging ? "STAGING CERTIFICATE: NOT TRUSTED BY BROWSERS. Do not use in production.\n\n" : ""}Certificate issued through Let's Encrypt.\nExpires: ${certificate.validUntil}\n\nKeep privkey.pem private. Store it with restricted file permissions.\n\nNginx:\nssl_certificate /path/fullchain.pem;\nssl_certificate_key /path/privkey.pem;\n\nApache:\nSSLCertificateFile /path/cert.pem\nSSLCertificateKeyFile /path/privkey.pem\nSSLCertificateChainFile /path/chain.pem\n\nModern Apache 2.4.8+ can instead use fullchain.pem for SSLCertificateFile and omit SSLCertificateChainFile.\n\nTest your server configuration before reloading it. These files are not automatically installed or renewed. Renew before the actual expiration date shown above.\nRemove temporary ACME challenge records/files after successful issuance.\n`,
  };
}