import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Node.js usage (not browser-based)
 * This is configured for server-side web scraping/crawling
 */
export default defineConfig({
  testDir: "./crawler",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
