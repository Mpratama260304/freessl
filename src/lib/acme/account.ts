import * as acme from "acme-client";
import { mkdir, readFile, writeFile, link, unlink, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "../../config/env";
import { AppError } from "../errors";

let activeClient: Promise<acme.Client> | undefined;

async function initialize(): Promise<acme.Client> {
  const settings = config();
  if (!settings.ACME_ACCOUNT_EMAIL || settings.ACME_TERMS_AGREED !== "true") throw new AppError("SERVICE_NOT_CONFIGURED", "Certificate issuance is not configured yet. The site operator must set the ACME contact email and accept Let's Encrypt's terms.", 503);
  const directory = join(settings.ACME_DATA_DIR, settings.ACME_ENVIRONMENT);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const keyPath = join(directory, "account.key");
  try {
    await readFile(keyPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const temporary = join(directory, `${randomBytes(16).toString("hex")}.key`);
    await writeFile(temporary, await acme.crypto.createPrivateEcdsaKey("P-256"), { flag: "wx", mode: 0o600 });
    try {
      await link(temporary, keyPath);
    } catch (linkError) {
      if ((linkError as NodeJS.ErrnoException).code !== "EEXIST") throw linkError;
    } finally {
      await unlink(temporary);
    }
  }
  let accountUrl: string | undefined;
  try {
    accountUrl = JSON.parse(await readFile(join(directory, "account.json"), "utf8")).url;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  acme.axios.defaults.timeout = 15000;
  acme.axios.defaults.maxContentLength = 1024 * 1024;
  const client = new acme.Client({ directoryUrl: settings.directoryUrl, accountKey: await readFile(keyPath), accountUrl, backoffAttempts: 3, backoffMin: 1000, backoffMax: 3000 });
  if (!accountUrl) {
    await client.createAccount({ termsOfServiceAgreed: true, contact: [`mailto:${settings.ACME_ACCOUNT_EMAIL}`] });
    const temporary = join(directory, `${randomBytes(16).toString("hex")}.json`);
    await writeFile(temporary, JSON.stringify({ url: client.getAccountUrl() }), { mode: 0o600 });
    await rename(temporary, join(directory, "account.json"));
  }
  return client;
}

export function acmeClient() {
  activeClient ??= initialize().catch((error) => { activeClient = undefined; throw error; });
  return activeClient;
}