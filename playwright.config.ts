import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000", browserName: "chromium", trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: { command: "pnpm dev", url: process.env.TEST_BASE_URL ?? "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120000 },
});