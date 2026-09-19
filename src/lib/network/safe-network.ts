import { Resolver } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import ipaddr from "ipaddr.js";
import { normalizeDomain } from "../validation/domains";
import { AppError } from "../errors";

export function isPublicAddress(address: string): boolean {
  try {
    if (address.includes("%")) return false;
    const parsed = ipaddr.parse(address);
    if (parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) return false;
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export function validateTarget(url: URL): string {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || url.hash) throw new AppError("UNSAFE_TARGET", "Only public HTTP and HTTPS endpoints on standard ports are supported.");
  const domain = normalizeDomain(url.hostname);
  if (domain.startsWith("*.")) throw new AppError("UNSAFE_TARGET", "Enter a specific hostname, not a wildcard.");
  return domain;
}

export async function resolvePublic(domain: string): Promise<string> {
  validateTarget(new URL(`https://${domain}`));
  const resolver = new Resolver({ timeout: 3000, tries: 1 });
  const results = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
  for (const result of results) {
    if (result.status === "rejected" && !["ENODATA", "ENOTFOUND"].includes(result.reason?.code)) throw new AppError("DNS_UNAVAILABLE", "DNS lookup could not be completed. Please try again.", 502);
  }
  const addresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length) throw new AppError("DNS_NOT_FOUND", "This hostname has no public IP address.");
  if (addresses.some((address) => !isPublicAddress(address))) throw new AppError("UNSAFE_TARGET", "Connections to private, reserved, or local networks are not allowed.");
  return addresses[0];
}

export function validateRedirect(from: URL, location: string, sameHost: boolean): URL {
  const destination = new URL(location, from);
  validateTarget(destination);
  if ((sameHost && destination.hostname !== from.hostname) || (from.protocol === "https:" && destination.protocol !== "https:")) throw new AppError("UNSAFE_REDIRECT", "The endpoint redirected to an unsupported destination.");
  return destination;
}

export interface SafeResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  url: string;
}

export async function safeRequest(input: URL, options: { method?: "HEAD" | "GET"; redirects?: number; sameHost?: boolean } = {}): Promise<SafeResponse> {
  const hostname = validateTarget(input);
  const address = await resolvePublic(hostname);
  const secure = input.protocol === "https:";
  const response = await new Promise<SafeResponse>((resolve, reject) => {
    const transport = secure ? https : http;
    const request = transport.request({
      hostname: address,
      port: secure ? 443 : 80,
      servername: hostname,
      checkServerIdentity: (_name, cert) => tls.checkServerIdentity(hostname, cert),
      path: input.pathname + input.search,
      method: options.method ?? "GET",
      headers: { Host: hostname, "User-Agent": "Certificate-Check/1.0", "Accept-Encoding": "identity" },
      agent: false,
      maxHeaderSize: 16384,
    }, (incoming) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      incoming.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 32768) request.destroy(new AppError("RESPONSE_TOO_LARGE", "The remote response exceeds the safety limit.", 502));
        else chunks.push(chunk);
      });
      incoming.on("error", reject);
      incoming.on("end", () => resolve({ status: incoming.statusCode ?? 502, headers: incoming.headers, body: Buffer.concat(chunks).toString("utf8"), url: input.href }));
    });
    const timer = setTimeout(() => request.destroy(new AppError("NETWORK_TIMEOUT", "The public endpoint did not respond in time.", 504)), 8000);
    request.on("close", () => clearTimeout(timer));
    request.on("error", (error) => reject(error instanceof AppError ? error : new AppError("NETWORK_ERROR", "Could not connect securely to the public endpoint.", 502)));
    request.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location && (options.redirects ?? 0) > 0) {
    return safeRequest(validateRedirect(input, response.headers.location, options.sameHost ?? false), { ...options, redirects: (options.redirects ?? 0) - 1 });
  }
  return response;
}

export async function inspectTls(domain: string) {
  const address = await resolvePublic(domain);
  return new Promise<{ certificate: tls.DetailedPeerCertificate; protocol: string | null; cipher: tls.CipherNameAndProtocol; authorized: boolean; hostnameMatch: boolean }>((resolve, reject) => {
    const socket = tls.connect({ host: address, port: 443, servername: domain, rejectUnauthorized: false, minVersion: "TLSv1.2" });
    const timer = setTimeout(() => socket.destroy(new AppError("TLS_TIMEOUT", "The TLS endpoint did not respond in time.", 504)), 8000);
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate(true);
      if (!certificate.raw) {
        socket.destroy(new AppError("TLS_CERTIFICATE", "The server did not present a certificate.", 502));
        return;
      }
      resolve({ certificate, protocol: socket.getProtocol(), cipher: socket.getCipher(), authorized: socket.authorized, hostnameMatch: !tls.checkServerIdentity(domain, certificate) });
      socket.destroy();
    });
    socket.once("close", () => clearTimeout(timer));
    socket.once("error", (error) => reject(error instanceof AppError ? error : new AppError("TLS_UNAVAILABLE", "A TLS 1.2 or newer connection could not be established.", 502)));
  });
}