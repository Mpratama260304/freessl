# Certlane

A no-login SSL certificate service using only Let's Encrypt ACME v2. Visitors generate an ECDSA P-256 or RSA 2048 key and CSR in their browser, prove domain ownership with DNS-01 or HTTP-01, and download the resulting PEM files or ZIP. Wildcards require DNS; multi-domain requests default to ten names.

**Verification status:** local unit, Redis integration, production build, browser, accessibility, and Docker build checks have passed. Real issuance from order creation through a signed staging certificate is **not yet verified**: no controlled domain or ACME contact was supplied. Do not treat this checkpoint as a completed production launch. The staging test below exercises the real service and never fabricates validation or certificates.

## Stack and layout

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, pnpm, Node.js 22+.
- EinUI registry components adapted for emerald/neutral light and dark themes, readable contrast, and 44px touch targets. Radix primitives, Lucide icons, and Sonner toasts.
- `acme-client` for ACME; Web Crypto and `@peculiar/x509` for client keys and signed CSRs; `fflate` for browser ZIP downloads.
- Redis for temporary orders, capability-token hashes, atomic rate limits, and order locks; Nginx for trusted proxying and TLS.

```text
src/app/              Pages, metadata, and API route handlers
src/components/       Generator wizard, checkers, navigation, EinUI primitives
src/config/           Branding, environment validation, guides, FAQ
src/lib/acme/         Account persistence, order lifecycle, DNS/HTTP challenges
src/lib/crypto/       Browser keys and CSR generation; server CSR validation
src/lib/network/      Shared SSRF-resistant HTTP/TLS connections
src/lib/redis/        Redis connections and distributed locks
src/lib/certificates/ Public order types and download bundle
deploy/               Nginx HTTP/TLS and Certbot bootstrap configuration
scripts/              Deployment and real staging issuance verification
tests/                Unit, Redis integration, browser/responsive tests
```

Branding lives in `src/config/site.ts`. There is no authentication system, user database, payment provider, admin dashboard, or external certificate-provider API key.

## Run locally

Use Node.js >=22.14, pnpm 10.32.1, and Docker for Redis:

```sh
corepack enable
pnpm install --frozen-lockfile
docker run -d --name certlane-redis -p 127.0.0.1:6379:6379 redis:7.4-alpine
pnpm dev
```

Open http://localhost:3000. With no environment file the service uses staging, Redis on loopback, and a shared development rate-limit identity. The UI and checkers work without an ACME account; certificate creation returns a configuration error until contact information and terms acceptance are set.

For local certificate issuance, create an ignored `.env.local`:

```dotenv
SITE_URL=http://localhost:3000
REDIS_URL=redis://127.0.0.1:6379
ACME_ENVIRONMENT=staging
ACME_ACCOUNT_EMAIL=your-contact@example.com
ACME_TERMS_AGREED=true
ACME_DATA_DIR=./data/acme
TRUST_PROXY=false
```

Replace the contact and accept the [Let's Encrypt subscriber agreement](https://letsencrypt.org/repository/) before setting `ACME_TERMS_AGREED=true`. No visitor email or login is needed. The operator account initializes automatically and is reused. Staging and production account data are stored separately.

Web Crypto requires a secure browser context: localhost works for local development, but remote access needs trusted HTTPS. When using a Codespaces forwarded URL, set `SITE_URL` to that exact HTTPS origin and restart the server; otherwise mutation requests fail the origin check. Leave `TRUST_PROXY=false` unless your own trusted proxy overwrites `X-Real-IP`.

## Environment

Copy `.env.example` to `.env` for Docker deployment and replace its example values. Never commit `.env`, account keys, test certificate outputs, or private keys.

| Variable | Purpose / default |
| --- | --- |
| `NODE_ENV` | `production` in Docker; let Next.js set this for local development |
| `SITE_URL` | Exact public origin, e.g. `https://ssl.example.com`, without a path |
| `ACME_ENVIRONMENT` | `staging` by default; only `staging` or `production` accepted |
| `ACME_ACCOUNT_EMAIL` | Operator contact, required for issuance |
| `ACME_TERMS_AGREED` | `false` until the operator accepts the CA terms |
| `ACME_DATA_DIR` | `./data/acme` locally; Compose sets `/app/data/acme` |
| `REDIS_URL` | `redis://127.0.0.1:6379` locally; Compose uses `redis://redis:6379` |
| `ORDER_TTL_SECONDS` | `1800`; updates never extend the original expiration |
| `MAX_DOMAINS_PER_CERT` | `10` |
| `MAX_ORDER_PER_IP_PER_HOUR` | `5` |
| `MAX_ORDERS_GLOBAL_PER_HOUR` | `100` |
| `TRUST_PROXY` | `false` locally; Compose uses `true` behind its Nginx |
| `RATE_LIMIT_SECRET` | Random stable value, at least 32 characters; required for production issuance |
| `TLS_ACME_ENVIRONMENT` | Separate CA mode for the website's own Nginx certificate |
| `HTTP_PORT` / `HTTPS_PORT` | Host bindings, normally `80` / `443` |
| `SUPPORT_EMAIL` | Optional public contact for the privacy page |

Generate a fresh rate-limit secret with `openssl rand -hex 32` and put it in the private environment file. Do not keep the example placeholder. Never expose Redis or the app's internal port directly to the internet in proxy-trust mode.

## Tests and real staging issuance

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

Redis must be running for integration tests and live checker browser tests. Playwright starts the development server unless a server is already available at `TEST_BASE_URL` (default `http://localhost:3000`). The configured `SITE_URL` must match that origin. Production-browser verification uses a built standalone server with its static assets, as in the Docker image.

Browser coverage includes all 15 page routes at widths 320, 360, 375, 390, 414, 430, 480, 640, 768, 820, 1024, 1280, 1440, 1600, 1920, and 2560. The primary viewport pairs are 360x800, 390x844, 430x932, 768x1024, 1024x768, 1280x800, 1440x900, and 1920x1080. Tests cover no page overflow, page errors, real TLS/security reports, mobile navigation, persistent themes, wildcard selection, browser CSR generation without a private-key upload, runtime SEO metadata, and automated WCAG checks in both themes. Screenshots and reports stay in ignored `test-results/` and `playwright-report/`.

The decisive external test needs a domain you control and a configured, running staging app:

```sh
STAGING_DOMAINS=example.com,*.example.com STAGING_METHOD=dns-01 \
	TEST_BASE_URL=http://localhost:3000 pnpm test:staging
```

Use your own domain, not `example.com`. The script creates a real order, displays every challenge, and pauses for you to publish it. Keep separate TXT values when the apex and wildcard share a record name. After confirmation it checks propagation, asks Let's Encrypt to validate, polls with time limits, checks the issued public key against the client key, and validates every ZIP entry. To test HTTP-01 use a non-wildcard name and `STAGING_METHOD=http-01`; publish each challenge on public port 80. Repeat with `STAGING_KEY_TYPE=rsa2048` when validating RSA support.

The script refuses a server that reports production before creating an order. Output is written under ignored `data/staging-result/` with restricted permissions; these test keys are local test artifacts, not keys retained by the deployed application. Staging certificates are real CA-signed certificates but are not browser-trusted. Never install them on a production website.

## Docker deployment

Requirements: a Linux host with Docker Compose, a public hostname pointing to it, and inbound TCP 80/443. Remove incorrect AAAA records or make IPv6 routing work. DNS/CAA policy must allow Let's Encrypt. No Google Cloud, manual CA account registration, or database migrations are needed.

1. Copy `.env.example` to `.env`; set the public `SITE_URL`, operator email, fresh rate-limit secret, and reviewed terms acceptance.
2. Keep `ACME_ENVIRONMENT=staging` while validating issuance. For a publicly usable website set `TLS_ACME_ENVIRONMENT=production` to obtain a trusted certificate for the service itself. This is separate from visitor issuance; bootstrap staging TLS instead only for deliberate TLS testing with a disposable test hostname.
3. Run `sh scripts/deploy.sh`. It starts app/Redis/Nginx, obtains the hosting certificate through Certbot HTTP-01, and restarts Nginx with TLS.
4. Check `docker compose ps`, `docker compose logs --tail=100 app`, and `curl -fsS https://YOUR_HOST/api/health`.

The app runs as UID 1001 with a health check. Services restart unless stopped. App and Redis are private on the Compose network. `acme_data` preserves the operator ACME account, `redis_data` preserves temporary order state, and `tls_data` / `tls_challenges` serve hosting TLS. Protect volume backups, keep a stable rate-limit secret, and do not delete volumes during routine updates.

The bootstrap script obtains hosting TLS once. Schedule this command on the host (for example twice daily with cron), and monitor failures:

```sh
docker compose --profile tls run --rm certbot renew && docker compose exec -T nginx nginx -s reload
```

Run it from the repository directory. Hosting renewal does not renew visitor certificates. The app's HTTP prechecker validates same-host challenge redirects; Nginx forwards trusted client-IP headers to the app. When deploying behind another proxy, adapt the trusted client-IP handling deliberately rather than accepting arbitrary forwarded headers.

## Switch visitor issuance to production

Complete the real staging test first. Ensure the website is on trusted HTTPS, set a fresh stable `RATE_LIMIT_SECRET`, then set `ACME_ENVIRONMENT=production` in `.env` and run:

```sh
docker compose up -d --force-recreate app
```

The server then uses `https://acme-v02.api.letsencrypt.org/directory`; staging uses `https://acme-staging-v02.api.letsencrypt.org/directory`. There is no configurable third-party CA URL. Do not run repeated tests against production. The operator's account shares Let's Encrypt rate limits across visitors, in addition to this application's own limits.

If the hosting certificate itself was originally issued by staging, merely changing `TLS_ACME_ENVIRONMENT` may keep the unexpired staging certificate. Explicitly replace that test certificate once, using your real email and service hostname:

```sh
docker compose --profile tls run --rm --entrypoint certbot certbot certonly \
	--non-interactive --agree-tos --force-renewal --webroot -w /var/www/acme \
	--cert-name certlane --server https://acme-v02.api.letsencrypt.org/directory \
	--email YOUR_CONTACT_EMAIL -d YOUR_SERVICE_HOSTNAME
docker compose restart nginx
```

## Security and data handling

- Certificate keys stay in browser memory; only the signed CSR goes to the server. Download PEM/ZIP before refreshing or leaving. No key recovery or guaranteed physical memory erasure is possible.
- The server rejects hidden request fields, mismatched CSR domains/key types, and invalid CSR signatures. Issued certificates are checked against the requested SANs and public key.
- Anonymous order IDs and HttpOnly capability cookies use cryptographic randomness. Redis stores the token hash, public CSR, challenges, and public certificate, not a visitor private key. Expiration is absolute, normally 30 minutes. Backups may retain older Redis bytes.
- One safe-network module blocks local/private/reserved IPv4 and IPv6 ranges, metadata and mapped/transition addresses. It validates DNS answers, pins outbound connections to checked IPs, checks redirects, and limits duration, response size, and headers. This is not a generic URL proxy or port scanner.
- Redis enforces atomic IP/global limits and order locks. Mutations require the exact configured origin and bounded JSON bodies. The proxy uses nonce-based CSP; Nginx TLS adds HSTS. Structured logs omit raw exceptions, request bodies, keys, and ownership cookies.
- The operator ACME key is separate from visitor keys and persists with restricted permissions. There are no advertising scripts or authentication dependencies.

## Operational limits and recovery

- Real end-to-end staging issuance and public deployment still require the operator-controlled domain and were not completed in this checkpoint. Browser tests do not substitute for CA validation or prove downloaded certificates from a live order.
- The image builds, Compose configuration validates, and the app/Redis/Nginx runtime smoke tests pass using local host networking. This Codespace's Docker bridge timed out for both app-to-Redis and Nginx-to-app connections; exact Compose bridge deployment is therefore not verified here. The production Compose network was not weakened to bypass that environment limitation. Verify it on the deployment host.
- Visitor certificates are issued manually and are not automatically renewed. Use an automated ACME client on the destination server for unattended renewal. Read the actual certificate expiry instead of assuming a fixed lifetime.
- Refreshing, closing, or navigating away from the generator loses its in-memory key. The server cannot recover it. Back up the key while verification is pending and download the complete ZIP once issued.
- HTTP prechecks follow at most three same-host redirects on standard ports; HTTPS redirects must be trusted. DNS resolver propagation and CA reachability can differ. Checkers inspect TLS 1.2+ and report header presence, not a comprehensive security audit.
- Browser automation was run in Chromium. Real iOS/Android hardware, Safari/Firefox, load testing, and a third-party security audit have not been performed. Automated accessibility checks do not replace assistive-technology testing.
- Codespaces is a development environment, not production hosting. Auto-stop terminates running processes. After restarting it, start the local Redis container (`docker start certlane-redis`) and run `pnpm dev` again. Git commit/push preserves code; it does not keep servers running or back up ignored secrets/volumes.

## EinUI source

Registry: `https://ui.eindev.ir/r/{name}.json`, configured as `@einui` in `components.json`. The official registry provides the Glass Button, Card, Input, Badge, Progress, Tooltip, and Sheet components used/adapted here. Install additional components with `pnpm dlx shadcn@latest add @einui/COMPONENT_NAME` after inspecting their current API. Review diffs before overwriting local theme/accessibility adaptations. The EinUI documentation website is not bundled.

Upstream: https://github.com/einui/einui. Its `LICENCE` file contains the MIT license (the README badge currently says ISC). The applicable notice is preserved in `THIRD_PARTY_NOTICES.md` and included in the Docker image.