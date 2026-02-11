/**
 * Quick script to inspect Crunchbase navigation structure.
 */
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("Fetching https://www.crunchbase.com...");
    await page.goto("https://www.crunchbase.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log("\n=== HEADER/NAV LINKS ===");
    $("header a[href], nav a[href]")
      .slice(0, 20)
      .each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && text && text.length > 1) {
          console.log(`  "${text}": ${href}`);
        }
      });

    console.log("\n=== ALL LINKS CONTAINING 'PRODUCT', 'SERVICE', 'SOLUTION' ===");
    $("a[href]").each((i, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const lowerHref = href.toLowerCase();
      const lowerText = text.toLowerCase();

      if (
        (lowerHref.includes("product") ||
          lowerHref.includes("service") ||
          lowerHref.includes("solution") ||
          lowerHref.includes("feature") ||
          lowerHref.includes("offering") ||
          lowerText.includes("product") ||
          lowerText.includes("service") ||
          lowerText.includes("solution") ||
          lowerText.includes("feature")) &&
        text.length < 100
      ) {
        console.log(`  "${text}": ${href}`);
      }
    });

    console.log("\n=== TOP 30 LINKS (FIRST OCCURRENCE) ===");
    const seen = new Set<string>();
    $("a[href]")
      .slice(0, 100)
      .each((i, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (href && text && !seen.has(href) && text.length > 1 && text.length < 60) {
          seen.add(href);
          console.log(`  "${text}": ${href}`);
          if (seen.size >= 30) return false;
        }
      });
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
