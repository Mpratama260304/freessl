export type KeyType = "ec256" | "rsa2048";
export type ValidationMethod = "dns-01" | "http-01";
export type OrderStatus = "waiting" | "ready" | "verifying" | "issuing" | "issued" | "failed";

export interface ChallengeView {
  id: string;
  domain: string;
  type: ValidationMethod;
  recordName: string;
  value: string;
  token: string;
  url: string;
  status: string;
  ready: boolean;
  message?: string;
}

export interface CertificateFiles {
  cert: string;
  chain: string;
  fullchain: string;
  validFrom: string;
  validUntil: string;
  issuer: string;
  fingerprint: string;
}

export interface OrderView {
  id: string;
  domains: string[];
  method: ValidationMethod;
  keyType: KeyType;
  environment: "staging" | "production";
  status: OrderStatus;
  createdAt: number;
  expiresAt: number;
  challenges: ChallengeView[];
  certificate?: CertificateFiles;
  error?: string;
}