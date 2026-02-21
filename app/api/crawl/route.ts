import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300; // 5 minutes max for crawl
export const dynamic = "force-dynamic";

interface CrawlRequestBody {
  jobId: string;
  competitorId: string;
  competitorUrl: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MAX_PAGES = 8;
const FETCH_TIMEOUT_MS = 15000;

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function computeHash(html: string): string {
  return crypto
    .createHash("sha256")
    .update(html.replace(/\s+/g, " ").trim())
    .digest("hex");
}

async function fetchPage(url: string): Promise<{ html: string; status: number; title: string | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 304) {
      console.warn(`[api/crawl] Fetch ${url} → ${res.status}`);
      return null;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim() || null;
    return { html, status: res.status, title };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[api/crawl] Fetch error ${url}:`, err);
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = normalizeUrl(href, baseUrl);
    if (!abs || !sameOrigin(abs, baseUrl) || seen.has(abs)) return;
    seen.add(abs);
    links.push(abs);
  });
  return links;
}

function extractSEO(html: string, pageUrl: string, title: string | null) {
  const $ = cheerio.load(html);
  const h1 = $("h1").first().text().trim();
  const h2s = $("h2").toArray().map((el) => $(el).text().trim()).filter(Boolean).slice(0, 20);
  const h3s = $("h3").toArray().map((el) => $(el).text().trim()).filter(Boolean).slice(0, 30);
  const metaDesc =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const wordCount = ($("main").text() || $("body").text())
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;

  const navLinks = $("nav a[href], header a[href]")
    .toArray()
    .map((el) => {
      const text = $(el).text().trim();
      const href = normalizeUrl($(el).attr("href") || "", pageUrl);
      return href ? { text, href } : null;
    })
    .filter(Boolean)
    .slice(0, 20) as { text: string; href: string }[];

  return { h1, h2s, h3s, metaDesc, wordCount, navLinks, title };
}

function detectPageType(url: string): string {
  const lower = url.toLowerCase();
  if (/\/(pricing|plans?|cost)\b/i.test(lower)) return "pricing";
  if (/\/(blog|news|articles?|posts?|updates?|resources?|insights?|press|media)\b/i.test(lower)) return "blog";
  if (/\/(about|team|company|culture|mission|vision|story|careers?|jobs?)\b/i.test(lower)) return "about";
  if (/\/(contact|support|help|demo|trial|get-started|signup|sign-up|register)\b/i.test(lower)) return "contact";
  if (/\/(features?|product|platform|solutions?|capabilities)\b/i.test(lower)) return "features";
  if (/\/(customers?|case-stud(y|ies)|testimonials?|success)\b/i.test(lower)) return "case_studies_or_customers";
  if (/\/(integrations?|partners?|ecosystem|marketplace)\b/i.test(lower)) return "integrations";
  try {
    const u = new URL(url);
    if (u.pathname === "/" || u.pathname === "") return "homepage";
  } catch { }
  return "homepage";
}

async function upsertPage(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  competitorId: string,
  url: string,
  pageType: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("competitor_id", competitorId)
    .eq("url", url)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("pages")
    .insert({ competitor_id: competitorId, url, page_type: pageType, updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) {
    console.error("[api/crawl] upsertPage error:", error.message);
    return null;
  }
  return data?.id as string;
}

async function getNextVersion(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  pageId: string
): Promise<number> {
  const { data } = await supabase
    .from("snapshots")
    .select("version_number")
    .eq("page_id", pageId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number((data as { version_number?: number } | null)?.version_number ?? 0) + 1;
}

export async function POST(request: NextRequest) {
  const body: CrawlRequestBody = await request.json().catch(() => ({})) as CrawlRequestBody;

  if (!body.jobId || !body.competitorId || !body.competitorUrl) {
    return NextResponse.json(
      { error: "jobId, competitorId, and competitorUrl are required" },
      { status: 400 }
    );
  }

  const { jobId, competitorId, competitorUrl } = body;
  const supabase = createSupabaseAdmin();
  const startedAt = new Date().toISOString();

  console.log(`[api/crawl] Starting serverless crawl for ${competitorUrl} job=${jobId}`);

  // Mark job as running
  await supabase
    .from("crawl_jobs")
    .update({ status: "running", started_at: startedAt })
    .eq("id", jobId);

  const errors: string[] = [];
  const crawledPages: { url: string; pageType: string; title: string | null }[] = [];

  try {
    // Fetch homepage first
    const homePage = await fetchPage(competitorUrl);
    if (!homePage) {
      throw new Error(`Failed to fetch homepage: ${competitorUrl}`);
    }

    // Collect links for additional pages
    const candidateLinks = extractLinks(homePage.html, competitorUrl)
      .filter((u) => sameOrigin(u, competitorUrl));

    // Prioritise key page types
    const priorityPatterns = [
      /\/pricing/i, /\/features/i, /\/about/i, /\/product/i,
      /\/solutions/i, /\/blog/i, /\/customers/i, /\/contact/i,
    ];
    const prioritised: string[] = [];
    const rest: string[] = [];
    for (const link of candidateLinks) {
      if (priorityPatterns.some((p) => p.test(link))) prioritised.push(link);
      else rest.push(link);
    }
    const toVisit = [competitorUrl, ...prioritised, ...rest].slice(0, MAX_PAGES);

    // Deduplicate
    const seen = new Set<string>([competitorUrl]);
    const finalQueue: string[] = [competitorUrl];
    for (const url of toVisit) {
      if (!seen.has(url)) { seen.add(url); finalQueue.push(url); }
    }

    // Crawl each page and persist snapshots
    const capturedAt = new Date().toISOString();

    for (const url of finalQueue.slice(0, MAX_PAGES)) {
      try {
        const result = url === competitorUrl ? homePage : await fetchPage(url);
        if (!result) {
          errors.push(`Failed to fetch: ${url}`);
          continue;
        }

        const pageType = detectPageType(url);
        const seo = extractSEO(result.html, url, result.title);
        const htmlHash = computeHash(result.html);

        // Upsert page record
        const pageId = await upsertPage(supabase, competitorId, url, pageType);
        if (!pageId) {
          errors.push(`Failed to upsert page: ${url}`);
          continue;
        }

        const versionNumber = await getNextVersion(supabase, pageId);

        // Save snapshot
        const snapshotPayload: Record<string, unknown> = {
          page_id: pageId,
          competitor_id: competitorId,
          crawl_job_id: jobId,
          version_number: versionNumber,
          captured_at: capturedAt,
          http_status: result.status,
          html_snapshot: result.html.slice(0, 500000), // cap at 500KB
          html_hash: htmlHash,
          screenshot_path: null,
          screenshot_url: null,
          primary_headline: seo.h1 || null,
          h1_text: seo.h1 || null,
          h2_headings: seo.h2s,
          h3_headings: seo.h3s,
          nav_items: seo.navLinks.map((l) => l.href),
          nav_labels: seo.navLinks.map((l) => l.text),
          list_items: [],
          structured_content: {
            meta_description: seo.metaDesc,
            word_count: seo.wordCount,
            title: seo.title,
          },
          primary_cta_text: null,
          secondary_cta_text: null,
          page_type: pageType,
        };

        const { error: snapErr } = await supabase.from("snapshots").insert(snapshotPayload);
        if (snapErr) {
          console.warn(`[api/crawl] snapshot insert error for ${url}:`, snapErr.message);
          errors.push(`Snapshot error for ${url}: ${snapErr.message}`);
        } else {
          crawledPages.push({ url, pageType, title: result.title });
          console.log(`[api/crawl] Crawled: ${url} (${pageType})`);
        }
      } catch (pageErr) {
        const msg = pageErr instanceof Error ? pageErr.message : String(pageErr);
        console.warn(`[api/crawl] Error crawling ${url}:`, msg);
        errors.push(`Error on ${url}: ${msg}`);
      }
    }

    // Try to update logo
    if (homePage) {
      const $ = cheerio.load(homePage.html);
      let logoUrl: string | null = null;
      $("img[src]").each((_, el) => {
        if (logoUrl) return;
        const src = $(el).attr("src") || "";
        const alt = ($(el).attr("alt") || "").toLowerCase();
        const cls = ($(el).attr("class") || "").toLowerCase();
        if (alt.includes("logo") || cls.includes("logo")) {
          try { logoUrl = new URL(src, competitorUrl).toString(); } catch { /* skip */ }
        }
      });
      if (logoUrl) {
        await supabase
          .from("competitors")
          .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
          .eq("id", competitorId);
      }
    }

    const completedAt = new Date().toISOString();

    // Mark job completed
    await supabase
      .from("crawl_jobs")
      .update({ status: "completed", completed_at: completedAt })
      .eq("id", jobId);

    // Update competitor last_crawled_at
    await supabase
      .from("competitors")
      .update({ last_crawled_at: completedAt, updated_at: completedAt })
      .eq("id", competitorId);

    console.log(`[api/crawl] Done. pages=${crawledPages.length}, errors=${errors.length}`);

    return NextResponse.json({
      ok: true,
      status: "completed",
      pages: crawledPages.length,
      errors,
      competitorId,
      crawlJobId: jobId,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal crawl error";
    console.error("[api/crawl] Fatal error:", errorMessage);

    await supabase
      .from("crawl_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", jobId);

    return NextResponse.json(
      { ok: false, error: errorMessage, competitorId, crawlJobId: jobId },
      { status: 500 }
    );
  }
}
