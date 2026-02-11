import { chromium, type BrowserContext } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { compareSnapshots } from "@/lib/change-detection/compareSnapshots";
import { crawlFailure, snapshotFailure } from "@/lib/log/crawl";
import { persistObservationalInsights } from "@/lib/insights/persistObservationalInsights";
import { persistWebpageSignalInsights } from "@/lib/insights/persistWebpageSignalInsights";
import { buildSeoIntelligence } from "@/lib/intelligence-engine/searchIntelligence/seoSnapshotComposer";
import type { SEOPageData } from "@/lib/intelligence-engine/searchIntelligence/contentCrawler";
import {
  PAGE_TAXONOMY,
  type PageType,
  detectPageTypeFromContent,
  detectPageTypeFromNav,
  detectPageTypeFromUrl,
  getPageTypePriority,
  shouldIgnorePage,
  MANDATORY_CRAWL_PATHS,
} from "@/lib/PAGE_TAXONOMY";

export type CrawlPageType = PageType;
type DbPageType = CrawlPageType;

interface NavItem {
  text: string;
  href: string;
}

interface PageSignals {
  primaryHeadline?: string | null;
  primaryCtaText?: string | null;
  primaryCtaHref?: string | null;
  secondaryCtaText?: string | null;
  topNavigation?: NavItem[];
  footerLinks?: NavItem[];
}

type ServiceSnapshot = {
  strategic_keywords_count: number;
  execution_keywords_count: number;
  lifecycle_keywords_count: number;
  enterprise_keywords_count: number;
  industries: string[];
  primary_focus: "Strategic" | "Execution" | "Balanced";
  section_count: number;
};

export interface CrawledPageSEO {
  url: string;
  h1: string;
  h2: string[];
  h3: string[];
  meta_title: string;
  meta_description: string;
  anchors: string[];
  slug: string;
  image_alt_text: string[];
  word_count: number;
}

export interface CrawledPageMetadata {
  pageType: CrawlPageType;
  url: string;
  title: string | null;
  httpStatus: number | null;
  html: string;
  screenshotBuffer: Buffer;
  screenshotMimeType: "image/png";
  signals?: PageSignals;
  seo?: CrawledPageSEO;
}

export interface CrawlCompetitorResult {
  ok: boolean;
  competitorId: string;
  competitorUrl: string;
  crawlJobId: string;
  startedAt: string;
  endedAt: string;
  status: "completed" | "failed";
  pages: CrawledPageMetadata[];
  errors: string[];
}

export interface CrawlCompetitorOptions {
  competitorId: string;
  competitorUrl: string;
  /**
   * If provided, use this existing crawl job (e.g. from enqueue) and mark it running.
   * Otherwise a new job is created.
   */
  existingCrawlJobId?: string;
  /**
   * Supabase Storage bucket to upload screenshots into.
   * Must already exist (create in Supabase Dashboard).
   */
  screenshotBucket?: string;
  /**
   * Playwright navigation timeout in ms.
   */
  navigationTimeoutMs?: number;
  /**
   * Retry attempts per page (in addition to first attempt).
   */
  retryCount?: number;
  /**
   * Respect robots.txt when possible.
   */
  respectRobotsTxt?: boolean;
  /**
   * User-agent rotation list.
   */
  userAgents?: string[];
  /**
   * Whether to run Chromium headless. Default true.
   */
  headless?: boolean;
}

export interface StandaloneCrawlResult {
  ok: boolean;
  baseUrl: string;
  startedAt: string;
  endedAt: string;
  pages: CrawledPageMetadata[];
  errors: string[];
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withScheme);
  // Normalize: drop hash, keep path (homepage may be "/")
  url.hash = "";
  return url.toString();
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

const DEFAULT_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/132.0",
];

const MAX_PAGES_TO_CRAWL = 8;
const MAX_SEO_CONTENT_PAGES = 3;

function classifySeoContentPath(url: string): CrawlPageType | null {
  const lower = url.toLowerCase();
  if (/\/case-stud(y|ies)(\/|$)/i.test(lower)) {
    return PAGE_TAXONOMY.CASE_STUDIES_OR_CUSTOMERS;
  }
  if (/\/(blog|resources|insights|knowledge|guides)(\/|$)/i.test(lower)) {
    return PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES;
  }
  return null;
}

function classifyLink(text: string, href: string): CrawlPageType | null {
  if (shouldIgnorePage(href, text)) return null;
  return detectPageTypeFromNav(text, href) ?? classifySeoContentPath(href);
}

function toDbPageType(pageType: CrawlPageType): DbPageType {
  return pageType;
}

function isMissingColumnError(err: unknown, column: string): boolean {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return (
    message.includes(`Could not find the '${column}' column`) ||
    message.toLowerCase().includes(`column \"${column}\" does not exist`) ||
    message.toLowerCase().includes(`column ${column} does not exist`)
  );
}

function isInvalidPageTypeEnumError(err: unknown): boolean {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return message.includes("invalid input value for enum page_type");
}

function schemaUpgradeHint(): string {
  return "Database schema appears out of date. Apply latest Supabase migrations (page_type enum + snapshots columns) and refresh the API schema cache, then re-run the crawl.";
}

function extractCandidateLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const $ = cheerio.load(html);
  const candidates: Array<{ href: string; text: string }> = [];

  $("nav a[href], header a[href], a[href]").each((_, el) => {
    const hrefRaw = ($(el).attr("href") ?? "").trim();
    const text = ($(el).text() ?? "").trim();
    if (!hrefRaw) return;

    let href = "";
    try {
      href = new URL(hrefRaw, baseUrl).toString();
    } catch {
      return;
    }

    candidates.push({ href, text });
  });

  return candidates
    .filter((l) => l.href.startsWith("http"))
    .filter((l) => sameOrigin(l.href, baseUrl))
    .filter((l) => !l.href.startsWith("mailto:") && !l.href.startsWith("tel:") && !l.href.startsWith("javascript:"));
}

function extractTopNavigationLinks(html: string, baseUrl: string): NavItem[] {
  const $ = cheerio.load(html);
  const links: NavItem[] = [];
  $("header nav a[href], nav a[href]").each((_, el) => {
    const text = ($(el).text() ?? "").trim();
    const hrefRaw = ($(el).attr("href") ?? "").trim();
    if (!text || !hrefRaw) return;
    try {
      const href = new URL(hrefRaw, baseUrl).toString();
      if (!sameOrigin(href, baseUrl)) return;
      if (shouldIgnorePage(href, text)) return;
      links.push({ text, href });
    } catch {
      return;
    }
  });
  const deduped = new Map<string, NavItem>();
  for (const link of links) {
    const key = `${link.href}::${link.text.toLowerCase()}`;
    if (!deduped.has(key)) deduped.set(key, link);
  }
  return Array.from(deduped.values()).slice(0, 25);
}

function extractFooterLinks(html: string, baseUrl: string): NavItem[] {
  const $ = cheerio.load(html);
  const links: NavItem[] = [];
  $("footer a[href]").each((_, el) => {
    const text = ($(el).text() ?? "").trim();
    const hrefRaw = ($(el).attr("href") ?? "").trim();
    if (!text || !hrefRaw) return;
    try {
      const href = new URL(hrefRaw, baseUrl).toString();
      if (!sameOrigin(href, baseUrl)) return;
      if (shouldIgnorePage(href, text)) return;
      links.push({ text, href });
    } catch {
      return;
    }
  });
  const deduped = new Map<string, NavItem>();
  for (const link of links) {
    const key = `${link.href}::${link.text.toLowerCase()}`;
    if (!deduped.has(key)) deduped.set(key, link);
  }
  return Array.from(deduped.values()).slice(0, 25);
}

function extractPrimaryCta(html: string, baseUrl: string): { text: string | null; href: string | null } {
  const $ = cheerio.load(html);
  const ctaCandidates = $("main a[href], header a[href], a[href], button")
    .toArray()
    .slice(0, 300)
    .map((el) => {
      const text = ($(el).text() ?? "").trim();
      const hrefRaw = $(el).attr("href")?.trim() ?? null;
      const lowered = text.toLowerCase();
      const ctaScore =
        (/(get started|book demo|request demo|start free|free trial|contact sales|talk to sales|sign up|signup)/i.test(
          text
        )
          ? 10
          : 0) +
        (["main", "header"].includes($(el).closest("main,header").first().prop("tagName")?.toLowerCase() ?? "")
          ? 2
          : 0) +
        (lowered.length > 1 && lowered.length < 40 ? 1 : 0);
      if (ctaScore <= 0) return null;
      let href: string | null = null;
      if (hrefRaw) {
        try {
          href = new URL(hrefRaw, baseUrl).toString();
        } catch {
          href = null;
        }
      }
      return { text, href, score: ctaScore };
    })
    .filter((item): item is { text: string; href: string | null; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  const top = ctaCandidates[0];
  if (!top) return { text: null, href: null };
  return { text: top.text, href: top.href };
}

function extractPrimaryHeadline(html: string): string | null {
  const $ = cheerio.load(html);
  const headline = $("main h1, header h1, h1").first().text().trim();
  return headline || null;
}

function extractTopCtas(
  html: string,
  baseUrl: string,
  limit: number
): Array<{ text: string; href: string | null }> {
  const $ = cheerio.load(html);
  const candidates = $("main a[href], header a[href], a[href], button")
    .toArray()
    .slice(0, 300)
    .map((el) => {
      const text = ($(el).text() ?? "").trim();
      const hrefRaw = $(el).attr("href")?.trim() ?? null;
      const lowered = text.toLowerCase();
      const ctaScore =
        (/(get started|book demo|request demo|start free|free trial|contact sales|talk to sales|sign up|signup)/i.test(
          text
        )
          ? 10
          : 0) +
        (["main", "header"].includes(
          $(el).closest("main,header").first().prop("tagName")?.toLowerCase() ?? ""
        )
          ? 2
          : 0) +
        (lowered.length > 1 && lowered.length < 40 ? 1 : 0);
      if (ctaScore <= 0) return null;
      let href: string | null = null;
      if (hrefRaw) {
        try {
          href = new URL(hrefRaw, baseUrl).toString();
        } catch {
          href = null;
        }
      }
      return { text, href, score: ctaScore };
    })
    .filter((item): item is { text: string; href: string | null; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  const uniqueByText = new Map<string, { text: string; href: string | null }>();
  for (const cta of candidates) {
    const key = cta.text.toLowerCase();
    if (!uniqueByText.has(key)) uniqueByText.set(key, { text: cta.text, href: cta.href });
    if (uniqueByText.size >= limit) break;
  }
  return Array.from(uniqueByText.values()).slice(0, limit);
}

function extractH1Text(html: string): string | null {
  const $ = cheerio.load(html);
  const h1 = $("main h1, header h1, h1").first().text().trim();
  return h1 || null;
}

function extractH2Headings(html: string): string[] {
  const $ = cheerio.load(html);
  const withinMain = $("main h2").toArray();
  const nodes = withinMain.length > 0 ? withinMain : $("h2").toArray();
  const headings = nodes
    .map((el) => ($(el).text() ?? "").trim())
    .filter(Boolean)
    .filter((t) => t.length <= 140)
    .slice(0, 50);

  const deduped = new Map<string, string>();
  for (const h of headings) {
    const key = h.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, h);
  }
  return Array.from(deduped.values()).slice(0, 30);
}

function extractH3Headings(html: string): string[] {
  const $ = cheerio.load(html);
  const withinMain = $("main h3").toArray();
  const nodes = withinMain.length > 0 ? withinMain : $("h3").toArray();
  const headings = nodes
    .map((el) => ($(el).text() ?? "").trim())
    .filter(Boolean)
    .filter((t) => t.length <= 140)
    .slice(0, 80);

  const deduped = new Map<string, string>();
  for (const h of headings) {
    const key = h.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, h);
  }
  return Array.from(deduped.values()).slice(0, 50);
}

function extractListItems(html: string): string[] {
  const $ = cheerio.load(html);
  const items = $("main li, li")
    .toArray()
    .map((el) => ($(el).text() ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3 && t.length <= 180)
    .slice(0, 250);

  const deduped = new Map<string, string>();
  for (const item of items) {
    const key = item.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, item);
  }
  return Array.from(deduped.values()).slice(0, 120);
}

function extractMetaDescription(html: string): string {
  const $ = cheerio.load(html);
  return (
    $('meta[name="description"]').attr("content") ??
    $('meta[property="og:description"]').attr("content") ??
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractInternalAnchorText(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const anchors = $("a[href]")
    .toArray()
    .map((el) => {
      const text = ($(el).text() ?? "").replace(/\s+/g, " ").trim();
      const hrefRaw = ($(el).attr("href") ?? "").trim();
      if (!text || !hrefRaw) return null;
      try {
        const href = new URL(hrefRaw, pageUrl).toString();
        if (!sameOrigin(href, pageUrl)) return null;
        return text;
      } catch {
        return null;
      }
    })
    .filter((v): v is string => Boolean(v))
    .filter((t) => t.length >= 2 && t.length <= 120);

  const deduped = new Map<string, string>();
  for (const text of anchors) {
    const key = text.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, text);
  }
  return Array.from(deduped.values()).slice(0, 200);
}

function extractUrlSlug(pageUrl: string): string {
  try {
    const pathname = new URL(pageUrl).pathname;
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return last.replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

function extractImageAltText(html: string): string[] {
  const $ = cheerio.load(html);
  const alts = $("img[alt]")
    .toArray()
    .map((el) => ($(el).attr("alt") ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2 && t.length <= 180);

  const deduped = new Map<string, string>();
  for (const text of alts) {
    const key = text.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, text);
  }
  return Array.from(deduped.values()).slice(0, 120);
}

function computeWordCount(html: string): number {
  const $ = cheerio.load(html);
  const text = $("main").text() || $("body").text() || "";
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

function extractCrawledPageSEO(html: string, pageUrl: string, title: string | null): CrawledPageSEO {
  return {
    url: pageUrl,
    h1: extractH1Text(html) ?? "",
    h2: extractH2Headings(html),
    h3: extractH3Headings(html),
    meta_title: title ?? "",
    meta_description: extractMetaDescription(html),
    anchors: extractInternalAnchorText(html, pageUrl),
    slug: extractUrlSlug(pageUrl),
    image_alt_text: extractImageAltText(html),
    word_count: computeWordCount(html),
  };
}

function countKeywords(text: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi"));
    if (matches) count += matches.length;
  }
  return count;
}

function analyzeServiceContent(html: string): ServiceSnapshot {
  const $ = cheerio.load(html);
  const normalizedText = $("main").text().replace(/\s+/g, " ").trim().toLowerCase();

  const strategicKeywords = [
    "strategy",
    "transformation",
    "advisory",
    "roadmap",
    "innovation",
    "operating model",
  ];
  const executionKeywords = [
    "implementation",
    "delivery",
    "deployment",
    "build",
    "integrate",
    "optimize",
  ];
  const lifecycleKeywords = ["discovery", "design", "launch", "support", "operate", "maintenance"];
  const enterpriseKeywords = ["enterprise", "global", "governance", "compliance", "cxo", "fortune"];

  const strategicCount = countKeywords(normalizedText, strategicKeywords);
  const executionCount = countKeywords(normalizedText, executionKeywords);
  const lifecycleCount = countKeywords(normalizedText, lifecycleKeywords);
  const enterpriseCount = countKeywords(normalizedText, enterpriseKeywords);

  const industries = [
    "healthcare",
    "finance",
    "banking",
    "insurance",
    "retail",
    "manufacturing",
    "logistics",
    "telecom",
    "saas",
    "public sector",
    "education",
    "energy",
  ].filter((industry) => normalizedText.includes(industry));

  const h2Count = $("main h2, h2").length;
  const h3Count = $("main h3, h3").length;
  const sectionCount = Math.min(h2Count + h3Count, 50);

  const primaryFocus: ServiceSnapshot["primary_focus"] =
    strategicCount > executionCount
      ? "Strategic"
      : executionCount > strategicCount
      ? "Execution"
      : "Balanced";

  return {
    strategic_keywords_count: strategicCount,
    execution_keywords_count: executionCount,
    lifecycle_keywords_count: lifecycleCount,
    enterprise_keywords_count: enterpriseCount,
    industries,
    primary_focus: primaryFocus,
    section_count: sectionCount,
  };
}

function extractNavLabels(html: string, baseUrl: string): string[] {
  const top = extractTopNavigationLinks(html, baseUrl).map((l) => l.text).filter(Boolean);
  const deduped = new Map<string, string>();
  for (const label of top) {
    const key = label.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, label);
  }
  return Array.from(deduped.values()).slice(0, 25);
}

function computeHtmlHash(html: string): string {
  const normalizedHtml = html
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
  return crypto.createHash("sha256").update(normalizedHtml).digest("hex");
}

/**
 * Generate mandatory URLs to attempt for a given base URL.
 * Looks for matching domain rules in MANDATORY_CRAWL_PATHS.
 */
function generateMandatoryUrls(baseUrl: string): Array<{ url: string; pageType: CrawlPageType | null }> {
  const { origin } = new URL(baseUrl);
  const candidates: Array<{ url: string; pageType: CrawlPageType | null }> = [];

  // Find matching domain patterns in MANDATORY_CRAWL_PATHS
  const domainRules: string[] = [];
  for (const [domainPattern, paths] of Object.entries(MANDATORY_CRAWL_PATHS)) {
    try {
      const regex = new RegExp(domainPattern, "i");
      if (regex.test(new URL(origin).hostname)) {
        domainRules.push(...paths);
      }
    } catch {
      // Skip invalid regex patterns
    }
  }

  // Attempt each mandatory path
  for (const path of domainRules) {
    try {
      const url = new URL(path.startsWith("/") ? path : `/${path}`, origin).toString();
      // Detect page type from URL
      const pageType = detectPageTypeFromUrl(url);
      candidates.push({ url, pageType });
    } catch {
      // Skip invalid URLs
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

function pickTargetUrls(
  baseUrl: string,
  links: Array<{ href: string; text: string }>
): Array<{ pageType: CrawlPageType; url: string }> {
  const origin = new URL(baseUrl).origin;
  const selectedByType = new Map<CrawlPageType, string>();
  const selectedPages: Array<{ pageType: CrawlPageType; url: string }> = [
    { pageType: PAGE_TAXONOMY.HOMEPAGE, url: origin },
  ];
  selectedByType.set(PAGE_TAXONOMY.HOMEPAGE, origin);

  // Collect discovered links (from nav, header, etc.)
  const typedCandidates = links
    .map((link) => {
      const pageType = classifyLink(link.text, link.href);
      if (!pageType) return null;
      return { pageType, href: link.href };
    })
    .filter((item): item is { pageType: CrawlPageType; href: string } => Boolean(item))
    .filter((item) => item.pageType !== PAGE_TAXONOMY.NAVIGATION)
    .sort((a, b) => getPageTypePriority(a.pageType) - getPageTypePriority(b.pageType));

  // Add discovered links first
  for (const candidate of typedCandidates) {
    if (selectedByType.has(candidate.pageType)) continue;
    selectedByType.set(candidate.pageType, candidate.href);
    selectedPages.push({ pageType: candidate.pageType, url: candidate.href });
    if (selectedPages.length >= MAX_PAGES_TO_CRAWL) break;
  }

  // Add a small number of SEO-content URLs for keyword intelligence without overloading crawl volume.
  if (selectedPages.length < MAX_PAGES_TO_CRAWL) {
    const seoCandidates = links
      .map((link) => {
        const pageType = classifySeoContentPath(link.href);
        if (!pageType) return null;
        return { pageType, url: link.href };
      })
      .filter((item): item is { pageType: CrawlPageType; url: string } => Boolean(item));

    let addedSeoPages = 0;
    for (const candidate of seoCandidates) {
      if (selectedPages.length >= MAX_PAGES_TO_CRAWL || addedSeoPages >= MAX_SEO_CONTENT_PAGES) break;
      if (selectedPages.some((p) => p.url === candidate.url)) continue;
      selectedPages.push(candidate);
      addedSeoPages += 1;
    }
  }

  // Then fill remaining slots with mandatory URLs if not yet selected
  if (selectedPages.length < MAX_PAGES_TO_CRAWL) {
    const mandatoryUrls = generateMandatoryUrls(baseUrl);
    for (const { url, pageType } of mandatoryUrls) {
      if (selectedPages.length >= MAX_PAGES_TO_CRAWL) break;

      // Skip if this page type is already selected, or if URL is already crawled
      if (pageType && selectedByType.has(pageType)) continue;
      if (selectedPages.some((p) => p.url === url)) continue;

      // Add this mandatory URL if we have a page type
      if (pageType && pageType !== PAGE_TAXONOMY.NAVIGATION) {
        selectedByType.set(pageType, url);
        selectedPages.push({ pageType, url });
      }
    }
  }

  return selectedPages;
}

function buildScreenshotPath(params: {
  competitorId: string;
  crawlJobId: string;
  pageType: CrawlPageType;
  pageUrl: string;
}): string {
  const safeUrl = Buffer.from(params.pageUrl).toString("base64url").slice(0, 64);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `competitors/${params.competitorId}/crawl_jobs/${params.crawlJobId}/${ts}-${params.pageType}-${safeUrl}.png`;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  // Prefer service role key; fall back to anon key (works when RLS is disabled)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function upsertPageId(supabase: SupabaseClient, competitorId: string, url: string, pageType: CrawlPageType): Promise<string> {
  const dbPageType = toDbPageType(pageType);
  const { data: existing, error: selectError } = await supabase
    .from("pages")
    .select("id, page_type")
    .eq("competitor_id", competitorId)
    .eq("url", url)
    .limit(1)
    .single();

  if (selectError && selectError.code !== "PGRST116") {
    throw new Error(`Failed to lookup page: ${selectError.message}`);
  }
  if (existing?.id) {
    // Keep page_type aligned with latest classification (best-effort).
    if (existing.page_type && String(existing.page_type) !== dbPageType) {
      await supabase
        .from("pages")
        .update({ page_type: dbPageType, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("pages")
    .insert({
      competitor_id: competitorId,
      url,
      page_type: dbPageType,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    if (insertError && isInvalidPageTypeEnumError(insertError)) {
      throw new Error(`Failed to create page: ${insertError.message}. ${schemaUpgradeHint()}`);
    }
    throw new Error(`Failed to create page: ${insertError?.message ?? "unknown error"}`);
  }

  return inserted.id as string;
}

async function createCrawlJobId(supabase: SupabaseClient, competitorId: string): Promise<string> {
  const { data, error } = await supabase
    .from("crawl_jobs")
    .insert({
      competitor_id: competitorId,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create crawl job: ${error?.message ?? "unknown error"}`);
  }
  return data.id as string;
}

async function finalizeCrawlJob(supabase: SupabaseClient, crawlJobId: string, status: "completed" | "failed", errorMessage?: string) {
  const update: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString(),
  };
  if (errorMessage) update.error_message = errorMessage;
  const { error } = await supabase.from("crawl_jobs").update(update).eq("id", crawlJobId);
  if (error) {
    // Best-effort; don't throw and mask the original error.
    // eslint-disable-next-line no-console
    console.warn("Failed to finalize crawl job:", error.message);
  }
}

async function uploadScreenshot(
  supabase: SupabaseClient,
  bucket: string,
  screenshotPath: string,
  screenshotBuffer: Buffer
): Promise<{ screenshotPath: string; screenshotUrl: string | null }> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(screenshotPath, screenshotBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(screenshotPath);
  return { screenshotPath, screenshotUrl: data?.publicUrl ?? null };
}

async function getNextSnapshotVersion(supabase: SupabaseClient, pageId: string): Promise<number> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("version_number")
    .eq("page_id", pageId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to determine snapshot version: ${error.message}`);
  }

  const current = Number((data as { version_number?: number } | null)?.version_number ?? 0);
  return current + 1;
}

async function persistSnapshot(params: {
  supabase: SupabaseClient;
  competitorId: string;
  crawlJobId: string;
  pageId: string;
  pageType: CrawlPageType;
  url: string;
  html: string;
  screenshotPath: string;
  screenshotUrl: string | null;
  httpStatus: number | null;
  title: string | null;
  versionNumber: number;
  primaryHeadline: string | null;
  h1Text: string | null;
  h2Headings: string[];
  h3Headings: string[];
  listItems: string[];
  structuredContent: Record<string, unknown> | null;
  primaryCtaText: string | null;
  secondaryCtaText: string | null;
  navItems: string[];
  navLabels: string[];
  htmlHash: string;
  capturedAt: string;
}) {
  const dbPageType = toDbPageType(params.pageType);
  const fullPayload: Record<string, unknown> = {
    competitor_id: params.competitorId,
    page_id: params.pageId,
    crawl_job_id: params.crawlJobId,
    url: params.url,
    page_type: dbPageType,
    html: params.html,
    screenshot_path: params.screenshotPath,
    screenshot_url: params.screenshotUrl,
    http_status: params.httpStatus,
    title: params.title,
    page_title: params.title,
    version_number: params.versionNumber,
    primary_headline: params.primaryHeadline,
    h1_text: params.h1Text,
    h2_headings: params.h2Headings,
    h3_headings: params.h3Headings,
    list_items: params.listItems,
    structured_content: params.structuredContent,
    primary_cta_text: params.primaryCtaText,
    secondary_cta_text: params.secondaryCtaText,
    nav_items: params.navItems,
    nav_labels: params.navLabels,
    html_hash: params.htmlHash,
    captured_at: params.capturedAt,
  };

  let { data, error } = await params.supabase
    .from("snapshots")
    .insert(fullPayload)
    .select("id")
    .single();

  if (error) {
    // Backward-compatible retry for older DB schemas (missing new structured columns).
    if (
      isMissingColumnError(error, "captured_at") ||
      isMissingColumnError(error, "primary_headline") ||
      isMissingColumnError(error, "primary_cta_text") ||
      isMissingColumnError(error, "nav_items") ||
      isMissingColumnError(error, "html_hash") ||
      isMissingColumnError(error, "page_title") ||
      isMissingColumnError(error, "h1_text") ||
      isMissingColumnError(error, "h2_headings") ||
      isMissingColumnError(error, "h3_headings") ||
      isMissingColumnError(error, "list_items") ||
      isMissingColumnError(error, "structured_content") ||
      isMissingColumnError(error, "secondary_cta_text") ||
      isMissingColumnError(error, "nav_labels")
    ) {
      const minimalPayload: Record<string, unknown> = {
        competitor_id: params.competitorId,
        page_id: params.pageId,
        crawl_job_id: params.crawlJobId,
        url: params.url,
        page_type: dbPageType,
        html: params.html,
        screenshot_path: params.screenshotPath,
        screenshot_url: params.screenshotUrl,
        http_status: params.httpStatus,
        title: params.title,
        version_number: params.versionNumber,
      };

      const retry = await params.supabase
        .from("snapshots")
        .insert(minimalPayload)
        .select("id")
        .single();

      data = retry.data;
      error = retry.error;
      if (error) {
        throw new Error(`Failed to persist snapshot: ${error.message}. ${schemaUpgradeHint()}`);
      }
    } else if (isInvalidPageTypeEnumError(error)) {
      throw new Error(`Failed to persist snapshot: ${error.message}. ${schemaUpgradeHint()}`);
    } else {
      throw new Error(`Failed to persist snapshot: ${error.message}`);
    }
  }

  if (!data?.id) throw new Error("Failed to persist snapshot: missing snapshot id");
  return String(data.id);
}

async function persistSeoSnapshot(params: {
  supabase: SupabaseClient;
  competitorId: string;
  pages: SEOPageData[];
  capturedAt: string;
}) {
  const seoIntelligence = buildSeoIntelligence({
    competitorId: params.competitorId,
    pages: params.pages,
    previousSnapshots: [],
  });

  const { error } = await params.supabase.from("seo_snapshots").insert({
    competitor_id: params.competitorId,
    seo_dimensions: seoIntelligence.dimensions,
    topic_clusters: seoIntelligence.weightedClusters,
    captured_at: params.capturedAt,
  });

  if (error) {
    if (isMissingColumnError(error, "seo_dimensions") || String(error.message).includes("relation \"seo_snapshots\" does not exist")) {
      // Keep crawl healthy even if migration is not applied yet.
      return;
    }
    throw new Error(`Failed to persist SEO snapshot: ${error.message}`);
  }
}

function parseRobotsTxt(content: string) {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const groups: Array<{ userAgents: string[]; allows: string[]; disallows: string[] }> = [];
  let current: { userAgents: string[]; allows: string[]; disallows: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [directiveRaw, ...rest] = line.split(":");
    if (!directiveRaw || rest.length === 0) continue;
    const directive = directiveRaw.toLowerCase();
    const value = rest.join(":").trim();

    if (directive === "user-agent") {
      if (!current || current.allows.length || current.disallows.length) {
        current = { userAgents: [], allows: [], disallows: [] };
        groups.push(current);
      }
      current.userAgents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    if (directive === "allow") current.allows.push(value);
    if (directive === "disallow") current.disallows.push(value);
  }

  return groups;
}

function isRobotsAllowed(pathname: string, rules: { allows: string[]; disallows: string[] }) {
  const allowRules = rules.allows.filter(Boolean);
  const disallowRules = rules.disallows.filter(Boolean);
  const matchedAllow = allowRules.reduce((max, rule) => (pathname.startsWith(rule) && rule.length > max ? rule.length : max), -1);
  const matchedDisallow = disallowRules.reduce(
    (max, rule) => (pathname.startsWith(rule) && rule.length > max ? rule.length : max),
    -1
  );
  if (matchedAllow === -1 && matchedDisallow === -1) return true;
  return matchedAllow >= matchedDisallow;
}

async function fetchRobotsRules(origin: string, userAgent: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1500, timeoutMs));
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      signal: controller.signal,
      headers: { "user-agent": userAgent },
    });
    if (!response.ok) return null;
    const text = await response.text();
    const groups = parseRobotsTxt(text);
    const token = userAgent.toLowerCase();
    const exact = groups.find((g) => g.userAgents.some((ua) => ua !== "*" && token.includes(ua)));
    const wildcard = groups.find((g) => g.userAgents.includes("*"));
    return exact ?? wildcard ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function capturePageWithRetries(params: {
  contextFactory: (userAgent: string) => Promise<BrowserContext>;
  url: string;
  pageType: CrawlPageType;
  navigationTimeoutMs: number;
  retryCount: number;
  userAgents: string[];
}): Promise<CrawledPageMetadata> {
  let lastError: string = "Unknown crawl error";

  for (let attempt = 0; attempt <= params.retryCount; attempt += 1) {
    const userAgent = params.userAgents[attempt % params.userAgents.length];
    const context = await params.contextFactory(userAgent);
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(params.navigationTimeoutMs);
      page.setDefaultNavigationTimeout(params.navigationTimeoutMs);
      const response = await page.goto(params.url, {
        waitUntil: "domcontentloaded",
        timeout: params.navigationTimeoutMs,
      });
      await page.waitForLoadState("networkidle", { timeout: Math.min(params.navigationTimeoutMs, 15_000) }).catch(() => undefined);
      const html = await page.content();
      const title = await page.title().catch(() => null);
      const screenshot = await page.screenshot({ fullPage: true, type: "png", timeout: params.navigationTimeoutMs });
      const inferredPageType = detectPageTypeFromContent(html, params.url);
      const seo = extractCrawledPageSEO(html, params.url, title);
      const primaryHeadline = inferredPageType === PAGE_TAXONOMY.HOMEPAGE ? extractPrimaryHeadline(html) : null;
      const navSignals = params.pageType === PAGE_TAXONOMY.HOMEPAGE
        ? {
            primaryHeadline,
            topNavigation: extractTopNavigationLinks(html, params.url),
            footerLinks: extractFooterLinks(html, params.url),
            ...(() => {
              const top = extractTopCtas(html, params.url, 2);
              return {
                primaryCtaText: top[0]?.text ?? null,
                primaryCtaHref: top[0]?.href ?? null,
                secondaryCtaText: top[1]?.text ?? null,
              };
            })(),
          }
        : {};
      const signals: PageSignals = { ...navSignals };
      return {
        pageType: inferredPageType === PAGE_TAXONOMY.HOMEPAGE ? params.pageType : inferredPageType,
        url: params.url,
        title,
        httpStatus: response?.status() ?? null,
        html,
        screenshotBuffer: Buffer.from(screenshot),
        screenshotMimeType: "image/png",
        signals,
        seo,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === params.retryCount) {
        throw new Error(`Failed to crawl ${params.pageType} (${params.url}) after ${attempt + 1} attempt(s): ${lastError}`);
      }
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  throw new Error(lastError);
}

async function withBrowser<T>(headless: boolean, fn: (contextFactory: (userAgent: string) => Promise<BrowserContext>) => Promise<T>): Promise<T> {
  // Best-effort anti-bot hardening (no guarantees; some sites still block automation).
  const browser = await chromium.launch({
    headless,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    const contextFactory = async (userAgent: string) => {
      const context = await browser.newContext({
        userAgent,
        viewport: { width: 1440, height: 1024 },
        locale: "en-US",
        timezoneId: "America/New_York",
        extraHTTPHeaders: {
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      // Hide webdriver + common automation fingerprints.
      await context.addInitScript(() => {
        // @ts-expect-error - injected in browser runtime
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        // @ts-expect-error - injected in browser runtime
        Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
        // @ts-expect-error - injected in browser runtime
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
        // @ts-expect-error - injected in browser runtime
        (window as any).chrome = (window as any).chrome ?? { runtime: {} };
      });

      return context;
    };
    return await fn(contextFactory);
  } finally {
    await browser.close();
  }
}

/**
 * Standalone crawler with no database/storage dependency.
 * Returns structured crawl results and never throws.
 */
export async function crawlWebsiteStandalone(options: Omit<CrawlCompetitorOptions, "competitorId" | "screenshotBucket">): Promise<StandaloneCrawlResult> {
  const baseUrl = normalizeUrl(options.competitorUrl);
  const startedAt = new Date().toISOString();
  const navigationTimeoutMs = options.navigationTimeoutMs ?? 45_000;
  const retryCount = options.retryCount ?? 2;
  const respectRobotsTxt = options.respectRobotsTxt ?? true;
  const userAgents = options.userAgents?.length ? options.userAgents : DEFAULT_USER_AGENTS;
  const headless = options.headless ?? true;
  const errors: string[] = [];
  const pages: CrawledPageMetadata[] = [];

  await withBrowser(headless, async (contextFactory) => {
    const origin = new URL(baseUrl).origin;

    const homepage = await capturePageWithRetries({
      contextFactory,
      url: origin,
      pageType: "homepage",
      navigationTimeoutMs,
      retryCount,
      userAgents,
    }).catch((error) => {
      errors.push(error instanceof Error ? error.message : String(error));
      return null;
    });

    if (!homepage) return;
    pages.push(homepage);

    const links = extractCandidateLinks(homepage.html, origin);
    const targets = pickTargetUrls(origin, links).filter((t) => t.pageType !== "homepage");

    for (const target of targets) {
      const targetUrl = normalizeUrl(target.url);
      if (pages.some((p) => p.url === targetUrl)) continue;

      if (respectRobotsTxt) {
        const ua = userAgents[pages.length % userAgents.length];
        const rules = await fetchRobotsRules(origin, ua, navigationTimeoutMs);
        if (rules && !isRobotsAllowed(new URL(targetUrl).pathname, rules)) {
          errors.push(`Skipping ${targetUrl}: blocked by robots.txt`);
          continue;
        }
      }

      const crawled = await capturePageWithRetries({
        contextFactory,
        url: targetUrl,
        pageType: target.pageType,
        navigationTimeoutMs,
        retryCount,
        userAgents,
      }).catch((error) => {
        errors.push(error instanceof Error ? error.message : String(error));
        return null;
      });

      if (crawled) pages.push(crawled);
    }
  }).catch((error) => {
    errors.push(error instanceof Error ? error.message : String(error));
  });

  const endedAt = new Date().toISOString();
  return {
    ok: pages.length > 0,
    baseUrl,
    startedAt,
    endedAt,
    pages,
    errors,
  };
}

/**
 * Crawl + persist snapshots/changes/crawl_jobs in Supabase.
 * This function is failure-safe: it returns a failed result instead of throwing.
 */
export async function crawlCompetitor(options: CrawlCompetitorOptions): Promise<CrawlCompetitorResult> {
  const competitorUrl = normalizeUrl(options.competitorUrl);
  const competitorId = options.competitorId;
  const screenshotBucket = options.screenshotBucket ?? "screenshots";
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  const supabase = createSupabaseAdminClient();
  let crawlJobId = "";

  try {
    if (options.existingCrawlJobId) {
      crawlJobId = options.existingCrawlJobId;
      await supabase
        .from("crawl_jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .eq("id", crawlJobId);
    } else {
      crawlJobId = await createCrawlJobId(supabase, competitorId);
    }
    const standalone = await crawlWebsiteStandalone({
      competitorUrl,
      navigationTimeoutMs: options.navigationTimeoutMs,
      retryCount: options.retryCount,
      respectRobotsTxt: options.respectRobotsTxt,
      userAgents: options.userAgents,
      headless: options.headless,
    });

    errors.push(...standalone.errors);
    const persistedPages: CrawledPageMetadata[] = [];

    for (const page of standalone.pages) {
      try {
        const pageId = await upsertPageId(supabase, competitorId, page.url, page.pageType);
        const screenshotPath = buildScreenshotPath({
          competitorId,
          crawlJobId,
          pageType: page.pageType,
          pageUrl: page.url,
        });
        const { screenshotUrl } = await uploadScreenshot(
          supabase,
          screenshotBucket,
          screenshotPath,
          page.screenshotBuffer
        );
        const versionNumber = await getNextSnapshotVersion(supabase, pageId);
        const h1Text = page.seo?.h1 ?? extractH1Text(page.html);
        const h2Headings = page.seo?.h2 ?? extractH2Headings(page.html);
        const h3Headings = page.seo?.h3 ?? extractH3Headings(page.html);
        const listItems = extractListItems(page.html);
        const serviceSnapshot =
          page.pageType === PAGE_TAXONOMY.SERVICES ? analyzeServiceContent(page.html) : null;
        const structuredContent: Record<string, unknown> | null = page.seo
          ? serviceSnapshot
            ? { ...serviceSnapshot, search_seo: page.seo }
            : { search_seo: page.seo }
          : serviceSnapshot;
        const navLabels = extractNavLabels(page.html, page.url);
        const topCtas =
          page.pageType === PAGE_TAXONOMY.HOMEPAGE ? extractTopCtas(page.html, page.url, 2) : [];
        const primaryCtaText = page.signals?.primaryCtaText ?? topCtas[0]?.text ?? null;
        const secondaryCtaText = page.signals?.secondaryCtaText ?? topCtas[1]?.text ?? null;
        const snapshotId = await persistSnapshot({
          supabase,
          competitorId,
          crawlJobId,
          pageId,
          pageType: page.pageType,
          url: page.url,
          html: page.html,
          screenshotPath,
          screenshotUrl,
          httpStatus: page.httpStatus,
          title: page.title,
          versionNumber,
          primaryHeadline:
            page.pageType === PAGE_TAXONOMY.HOMEPAGE
              ? page.signals?.primaryHeadline ?? extractPrimaryHeadline(page.html)
              : null,
          h1Text,
          h2Headings,
          h3Headings,
          listItems,
          structuredContent,
          primaryCtaText,
          secondaryCtaText,
          navItems: navLabels,
          navLabels,
          htmlHash: computeHtmlHash(page.html),
          capturedAt: new Date().toISOString(),
        });

        // Previous snapshot query with backward-compatible fallback for older schemas.
        let previousSnapshot: any = null;
        const prevFull = await supabase
          .from("snapshots")
          .select("id, html, primary_headline, primary_cta_text, nav_items")
          .eq("page_id", pageId)
          .lt("version_number", versionNumber)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (
          prevFull.error &&
          (isMissingColumnError(prevFull.error, "primary_headline") ||
            isMissingColumnError(prevFull.error, "primary_cta_text") ||
            isMissingColumnError(prevFull.error, "nav_items"))
        ) {
          const prevMinimal = await supabase
            .from("snapshots")
            .select("id, html")
            .eq("page_id", pageId)
            .lt("version_number", versionNumber)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle();
          previousSnapshot = prevMinimal.data ?? null;
        } else {
          previousSnapshot = prevFull.data ?? null;
        }

        if (previousSnapshot?.id && previousSnapshot?.html) {
          await compareSnapshots({
            competitorId,
            pageId,
            pageUrl: page.url,
            pageType: page.pageType,
            beforeSnapshotId: String(previousSnapshot.id),
            beforeHtml: String(previousSnapshot.html),
            afterSnapshotId: snapshotId,
            afterHtml: page.html,
            beforeSignals: {
              primaryHeadline: previousSnapshot.primary_headline ?? null,
              primaryCtaText: previousSnapshot.primary_cta_text ?? null,
              navItems: Array.isArray(previousSnapshot.nav_items)
                ? previousSnapshot.nav_items
                    .map((item: unknown) => (typeof item === "string" ? item : ""))
                    .filter(Boolean)
                : [],
            },
            afterSignals: {
              primaryHeadline:
                page.pageType === PAGE_TAXONOMY.HOMEPAGE
                  ? page.signals?.primaryHeadline ?? extractPrimaryHeadline(page.html)
                  : null,
              primaryCtaText: page.signals?.primaryCtaText ?? null,
              navItems: (page.signals?.topNavigation ?? []).map((item) => item.text).filter(Boolean),
            },
            persist: true,
          }).catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Change detection failed for ${page.url}: ${msg}`);
          });
        }

        persistedPages.push(page);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(msg);
        snapshotFailure({
          competitorId,
          jobId: crawlJobId,
          pageUrl: page.url,
          pageType: page.pageType,
          message: "Snapshot or change save failed for page",
          cause: msg,
        });
      }
    }

    const ok = persistedPages.length > 0;
    if (errors.length > 0) {
      crawlFailure({
        competitorId,
        jobId: crawlJobId,
        url: competitorUrl,
        message: ok ? "Crawl completed with some failures" : "Crawl failed",
        errors,
      });
    }
    if (ok) {
      const seoPages: SEOPageData[] = persistedPages
        .filter((page) => /\/(blog|resources|insights|knowledge|case-studies?|guides)(\/|$)/i.test(page.url))
        .map((page) => ({
          url: page.url,
          h1: page.seo?.h1 ?? "",
          h2: page.seo?.h2 ?? [],
          h3: page.seo?.h3 ?? [],
          meta_title: page.seo?.meta_title ?? page.title ?? "",
          meta_description: page.seo?.meta_description ?? "",
          word_count: page.seo?.word_count ?? 0,
          published_at: undefined,
          anchor_text: page.seo?.anchors ?? [],
          slug: page.seo?.slug ?? "",
          image_alt_text: page.seo?.image_alt_text ?? [],
        }));

      await persistSeoSnapshot({
        supabase,
        competitorId,
        pages: seoPages,
        capturedAt: new Date().toISOString(),
      }).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`SEO snapshot save failed: ${msg}`);
      });

      await persistObservationalInsights({
        competitorId,
        pageTypes: persistedPages.map((page) => page.pageType),
      }).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Observational insight save failed: ${msg}`);
      });

      await persistWebpageSignalInsights({ competitorId }).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Webpage signal insight save failed: ${msg}`);
      });

      await supabase
        .from("competitors")
        .update({ last_crawled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", competitorId);
    }

    await finalizeCrawlJob(supabase, crawlJobId, ok ? "completed" : "failed", ok ? undefined : errors[0] ?? "No pages crawled");
    const endedAt = new Date().toISOString();

    return {
      ok,
      competitorId,
      competitorUrl,
      crawlJobId,
      startedAt,
      endedAt,
      status: ok ? "completed" : "failed",
      pages: persistedPages,
      errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown crawl error";
    errors.push(message);
    crawlFailure({
      competitorId,
      jobId: crawlJobId || undefined,
      url: competitorUrl,
      message: "Crawl failed",
      errors,
    });
    if (crawlJobId) {
      await finalizeCrawlJob(supabase, crawlJobId, "failed", message);
    }
    const endedAt = new Date().toISOString();
    return {
      ok: false,
      competitorId,
      competitorUrl,
      crawlJobId,
      startedAt,
      endedAt,
      status: "failed",
      pages: [],
      errors,
    };
  }
}

