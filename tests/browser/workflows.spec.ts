import { test, expect } from "@playwright/test";
import { validateCsr } from "../../src/lib/crypto/csr";

test("SEO metadata uses the configured runtime site origin", async ({ request, page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`<loc>${origin}/generate</loc>`);
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  await page.goto("/generate");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/generate`);
});

test("quick form normalizes URLs and enforces wildcard DNS validation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Domain name", { exact: true }).fill("https://Example.com/path");
  await page.getByRole("button", { name: "Generate SSL", exact: true }).click();
  await expect(page).toHaveURL(/domain=example.com/);
  await expect(page.getByLabel("Domain name", { exact: true })).toHaveValue("example.com");
  await page.getByRole("button", { name: "Add another domain" }).click();
  await page.getByLabel("Additional domain 1").fill("*.example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("radio", { name: /HTTP validation/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /DNS validation/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "Generate SSL certificate" })).toBeDisabled();
  await page.screenshot({ path: "test-results/visual/generator-validation-1280.png", fullPage: true });
});

test("real browser crypto produces a signed CSR without uploading its private key", async ({ page }) => {
  await page.goto("/generate?domain=example.com");
  await page.getByRole("button", { name: "Add another domain" }).click();
  await page.getByLabel("Additional domain 1").fill("*.example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  let posted: { csr: string; domains: string[]; keyType: "ec256" } | undefined;
  await page.route("**/api/certificates", async (route) => {
    posted = route.request().postDataJSON();
    await route.abort("blockedbyclient");
  });
  await page.getByRole("button", { name: "Generate SSL certificate" }).click();
  await expect.poll(() => posted).toBeTruthy();
  expect(JSON.stringify(posted)).not.toContain("PRIVATE KEY");
  expect(Object.keys(posted!)).not.toContain("privateKey");
  expect(posted!.domains).toEqual(["example.com", "*.example.com"]);
  await expect(validateCsr(posted!.csr, posted!.domains, posted!.keyType)).resolves.toContain("BEGIN PUBLIC KEY");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
});

test("mobile drawer is keyboard accessible and theme persists", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "test-results/visual/mobile-menu-360.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Choose color theme" }).click();
  await page.getByRole("menuitem", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/visual/home-dark-360.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/visual/home-dark-1440.png", fullPage: true });
  await page.getByRole("button", { name: "Choose color theme" }).click();
  await page.getByRole("menuitem", { name: "System", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("system");
});

test("real TLS and security reports render on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ssl-checker");
  await page.getByLabel("Public domain name").fill("letsencrypt.org");
  await page.getByRole("button", { name: "Check SSL", exact: true }).click();
  await expect(page.getByRole("region", { name: "SSL certificate report" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("SHA-256 fingerprint", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/visual/ssl-report-390.png", fullPage: true });
  await page.goto("/security-check");
  await page.getByLabel("Public domain name").fill("letsencrypt.org");
  await page.getByRole("button", { name: "Check security", exact: true }).click();
  await expect(page.getByRole("region", { name: "Security configuration report" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("heading", { name: "CAA DNS", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/visual/security-report-390.png", fullPage: true });
});