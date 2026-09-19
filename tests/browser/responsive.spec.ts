import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/generate", "/ssl-checker", "/security-check", "/guides", "/guides/nginx", "/guides/apache", "/guides/cpanel", "/guides/hestiacp", "/guides/cloudpanel", "/guides/nodejs", "/guides/docker", "/faq", "/privacy", "/terms"];
const viewports = [[360, 800], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];

for (const [width, height] of viewports) {
  test(`all pages fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
      expect(await page.locator("main").innerText()).not.toContain("Application error");
      if ([360, 1440].includes(width) || route === "/" || route === "/generate") {
        await page.screenshot({ path: `test-results/visual/${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.png`, fullPage: true });
      }
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 375, 414, 480, 640, 820, 1600, 2560]) {
  test(`all pages fit additional width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [...routes, "/generate?domain=*.example.com"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}

test("key pages meet automated accessibility checks in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
    await page.setViewportSize({ width: theme === "light" ? 390 : 1440, height: 900 });
    for (const route of ["/", "/generate", "/ssl-checker", "/security-check", "/guides", "/guides/nginx", "/faq", "/privacy", "/terms"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), `${theme} ${route}`).toEqual([]);
    }
  }
});