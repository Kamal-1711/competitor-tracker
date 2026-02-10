/**
 * Example Playwright crawler script
 * This demonstrates how to use Playwright for Node.js web scraping
 */

import { chromium } from "playwright";

async function exampleCrawler() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Example: Navigate to a page and extract data
    await page.goto("https://example.com");
    const title = await page.title();
    console.log("Page title:", title);

    // Add your crawling logic here
  } finally {
    await browser.close();
  }
}

// Uncomment to run:
// exampleCrawler().catch(console.error);
