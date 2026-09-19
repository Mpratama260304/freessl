export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { config } = await import("./config/env");
  const { logger } = await import("./lib/logger");
  const settings = config();
  if (!settings.ACME_ACCOUNT_EMAIL || settings.ACME_TERMS_AGREED !== "true") {
    logger.info({ operation: "acme-startup", status: "not-configured" });
    return;
  }
  try {
    const { acmeClient } = await import("./lib/acme/account");
    await acmeClient();
    logger.info({ operation: "acme-startup", status: "ready", environment: settings.ACME_ENVIRONMENT });
  } catch {
    logger.warn({ operation: "acme-startup", errorCode: "ACME_INITIALIZATION_FAILED" });
  }
}