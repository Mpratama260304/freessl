const forbiddenSuffixes = new Set(["localhost", "local", "internal", "invalid", "test", "example", "onion", "arpa", "home", "lan"]);

export function normalizeDomain(value: string): string {
  let input = value.trim().toLowerCase();
  if (!input || input.length > 2048 || /[\\\s\u0000-\u001f]/.test(input)) {
    throw new Error("Enter a valid public domain name.");
  }
  if (/^https?:\/\//.test(input)) {
    const authority = input.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    if (/[:@]/.test(authority)) throw new Error("Remove ports and credentials from the URL.");
    input = new URL(input).hostname;
  } else if (/[/:?#@]/.test(input)) {
    throw new Error("Enter a hostname without a port, path, or query string.");
  }
  const wildcard = input.startsWith("*.");
  const bare = wildcard ? input.slice(2) : input;
  if (bare.includes("*")) throw new Error("A wildcard must appear only once, as *.example.com.");
  let host: string;
  try {
    host = new URL(`https://${bare}`).hostname.replace(/\.$/, "");
  } catch {
    throw new Error("Enter a valid public domain name.");
  }
  const labels = host.split(".");
  const suffix = labels.at(-1)!;
  if (host.length > 253 || labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(suffix) || forbiddenSuffixes.has(suffix)) {
    throw new Error("Use a public domain such as example.com, not an IP address or local hostname.");
  }
  return `${wildcard ? "*." : ""}${host}`;
}

export function parseDomains(values: string[], maximum = 10): string[] {
  if (values.length < 1 || values.length > maximum) throw new Error(`Enter between 1 and ${maximum} domains.`);
  return [...new Set(values.map(normalizeDomain))];
}

export function hasWildcard(domains: string[]): boolean {
  return domains.some((domain) => domain.startsWith("*."));
}