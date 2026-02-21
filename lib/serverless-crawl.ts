/**
 * Serverless-compatible crawler using fetch + cheerio.
 * Works on Vercel without Playwright/Chromium.
 */
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dispatchNotifications } from "@/lib/notify";

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MAX_PAGES = 8;
const FETCH_TIMEOUT_MS = 15000;

// Valid page_type enum values in the database
const VALID_PAGE_TYPES = [
    "homepage",
    "pricing",
    "product",
    "product_or_services",
    "use_cases_or_industries",
    "case_studies_or_customers",
    "cta_elements",
    "navigation",
    "services",
    "blog",
] as const;

type ValidPageType = (typeof VALID_PAGE_TYPES)[number];

function createSupabaseAdmin(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
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

async function fetchPage(
    url: string
): Promise<{ html: string; status: number; title: string | null } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": USER_AGENT,
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            redirect: "follow",
        });
        clearTimeout(timer);
        const html = await res.text();
        const $ = cheerio.load(html);
        const title = $("title").first().text().trim() || null;
        return { html, status: res.status, title };
    } catch (err) {
        clearTimeout(timer);
        console.warn(`[serverless-crawl] Fetch error ${url}:`, err);
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
        // Skip anchors, mailto, javascript, file downloads
        if (
            abs.includes("#") ||
            abs.match(/\.(pdf|zip|png|jpg|jpeg|gif|svg|webp|mp4|mp3|doc|docx|xlsx|pptx)$/i)
        )
            return;
        seen.add(abs);
        links.push(abs);
    });
    return links;
}

function extractSEO(html: string, pageUrl: string, title: string | null) {
    const $ = cheerio.load(html);
    const h1 = $("h1").first().text().trim();
    const h2s = $("h2")
        .toArray()
        .map((el) => $(el).text().trim())
        .filter(Boolean)
        .slice(0, 20);
    const h3s = $("h3")
        .toArray()
        .map((el) => $(el).text().trim())
        .filter(Boolean)
        .slice(0, 30);
    const metaDesc =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "";

    const navLinks = $("nav a[href], header a[href]")
        .toArray()
        .map((el) => {
            const text = $(el).text().trim();
            const href = normalizeUrl($(el).attr("href") || "", pageUrl);
            return href ? { text, href } : null;
        })
        .filter(Boolean)
        .slice(0, 20) as { text: string; href: string }[];

    return { h1, h2s, h3s, metaDesc, navLinks, title };
}

function detectPageType(url: string): ValidPageType {
    const lower = url.toLowerCase();
    if (/\/(pricing|plans?|cost)\b/i.test(lower)) return "pricing";
    if (
        /\/(blog|news|articles?|posts?|updates?|resources?|insights?|press|media)\b/i.test(
            lower
        )
    )
        return "blog";
    if (/\/(about|team|company|culture|mission|vision|story|careers?|jobs?)\b/i.test(lower))
        return "product"; // map about to "product" since "about" isn't in enum
    if (/\/(features?|platform|capabilities)\b/i.test(lower)) return "product";
    if (/\/(product|solutions?)\b/i.test(lower)) return "product_or_services";
    if (
        /\/(customers?|case-stud(y|ies)|testimonials?|success)\b/i.test(lower)
    )
        return "case_studies_or_customers";
    if (/\/(integrations?|partners?|ecosystem|marketplace)\b/i.test(lower))
        return "product_or_services";
    if (/\/(services?|consulting|offerings?)\b/i.test(lower)) return "services";
    if (/\/(industries?|use-?cases?|verticals?)\b/i.test(lower))
        return "use_cases_or_industries";
    if (
        /\/(contact|support|help|demo|trial|get-started|signup|sign-up|register)\b/i.test(
            lower
        )
    )
        return "cta_elements";
    try {
        const u = new URL(url);
        if (u.pathname === "/" || u.pathname === "") return "homepage";
    } catch { }
    return "homepage";
}

function extractLogoUrl(html: string, baseUrl: string): string | null {
    const $ = cheerio.load(html);
    let best: { src: string; score: number } | null = null;

    $("img[src]").each((_, el) => {
        const src = ($(el).attr("src") || "").trim();
        if (!src) return;
        const alt = ($(el).attr("alt") || "").toLowerCase();
        const cls = ($(el).attr("class") || "").toLowerCase();
        const idAttr = ($(el).attr("id") || "").toLowerCase();
        let score = 0;
        if (alt.includes("logo")) score += 5;
        if (cls.includes("logo") || idAttr.includes("logo")) score += 4;
        if (src.toLowerCase().includes("logo")) score += 3;
        if (score > 0 && (!best || score > best.score)) {
            best = { src, score };
        }
    });

    if (!best) return null;
    try {
        return new URL((best as { src: string }).src, baseUrl).toString();
    } catch {
        return null;
    }
}

async function upsertPage(
    supabase: SupabaseClient,
    competitorId: string,
    url: string,
    pageType: ValidPageType
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
        .insert({
            competitor_id: competitorId,
            url,
            page_type: pageType,
            updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (error) {
        console.error("[serverless-crawl] upsertPage error:", error.message);
        return null;
    }
    return data?.id as string;
}

async function getNextVersion(
    supabase: SupabaseClient,
    pageId: string
): Promise<number> {
    const { data } = await supabase
        .from("snapshots")
        .select("version_number")
        .eq("page_id", pageId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
    return (
        Number(
            (data as { version_number?: number } | null)?.version_number ?? 0
        ) + 1
    );
}

export interface ServerlessCrawlResult {
    ok: boolean;
    status: "completed" | "failed";
    pages: number;
    errors: string[];
    competitorId: string;
    crawlJobId: string;
}

/**
 * Run a serverless crawl for a competitor.
 * This function can be called directly from a server action — no HTTP round-trip needed.
 */
export async function runServerlessCrawl(params: {
    jobId: string;
    competitorId: string;
    competitorUrl: string;
}): Promise<ServerlessCrawlResult> {
    const { jobId, competitorId, competitorUrl } = params;
    const supabase = createSupabaseAdmin();
    const startedAt = new Date().toISOString();

    console.log(
        `[serverless-crawl] Starting crawl for ${competitorUrl} job=${jobId}`
    );

    // Mark job as running
    await supabase
        .from("crawl_jobs")
        .update({ status: "running", started_at: startedAt })
        .eq("id", jobId);

    const errors: string[] = [];
    let crawledCount = 0;

    try {
        // 1. Fetch homepage
        const homePage = await fetchPage(competitorUrl);
        if (!homePage) {
            throw new Error(`Failed to fetch homepage: ${competitorUrl}`);
        }

        // 2. Discover links
        const candidateLinks = extractLinks(homePage.html, competitorUrl);

        // 3. Prioritise key pages
        const priorityPatterns = [
            /\/pricing/i,
            /\/features/i,
            /\/product/i,
            /\/about/i,
            /\/solutions/i,
            /\/blog/i,
            /\/customers/i,
            /\/services/i,
        ];
        const prioritised: string[] = [];
        const rest: string[] = [];
        for (const link of candidateLinks) {
            if (priorityPatterns.some((p) => p.test(link))) prioritised.push(link);
            else rest.push(link);
        }

        // Build final queue with dedup
        const seen = new Set<string>();
        const addUrl = (u: string) => {
            if (!seen.has(u)) {
                seen.add(u);
                return true;
            }
            return false;
        };
        const finalQueue: string[] = [];
        addUrl(competitorUrl);
        finalQueue.push(competitorUrl);
        for (const u of [...prioritised, ...rest]) {
            if (finalQueue.length >= MAX_PAGES) break;
            if (addUrl(u)) finalQueue.push(u);
        }

        // 4. Crawl each page
        const capturedAt = new Date().toISOString();

        for (const url of finalQueue) {
            try {
                const result = url === competitorUrl ? homePage : await fetchPage(url);
                if (!result) {
                    errors.push(`Failed to fetch: ${url}`);
                    continue;
                }

                const pageType = detectPageType(url);
                const seo = extractSEO(result.html, url, result.title);
                const htmlHash = computeHash(result.html);

                // Upsert page
                const pageId = await upsertPage(supabase, competitorId, url, pageType);
                if (!pageId) {
                    errors.push(`Failed to upsert page: ${url}`);
                    continue;
                }

                const versionNumber = await getNextVersion(supabase, pageId);

                // Build snapshot — match exact DB schema
                const snapshotPayload = {
                    page_id: pageId,
                    competitor_id: competitorId,
                    crawl_job_id: jobId,
                    url: url,
                    page_type: pageType,
                    version_number: versionNumber,
                    captured_at: capturedAt,
                    http_status: result.status,
                    html: result.html.slice(0, 500000),
                    html_hash: htmlHash,
                    screenshot_path: "", // NOT NULL, use empty string
                    screenshot_url: null,
                    title: result.title,
                    page_title: result.title,
                    primary_headline: seo.h1 || null,
                    h1_text: seo.h1 || null,
                    h2_headings: seo.h2s,
                    h3_headings: seo.h3s,
                    nav_items: seo.navLinks.map((l) => l.href),
                    nav_labels: seo.navLinks.map((l) => l.text),
                    list_items: [] as string[],
                    structured_content: {
                        meta_description: seo.metaDesc,
                        title: seo.title,
                    },
                    primary_cta_text: null,
                    secondary_cta_text: null,
                };

                const { error: snapErr } = await supabase
                    .from("snapshots")
                    .insert(snapshotPayload);
                if (snapErr) {
                    console.warn(
                        `[serverless-crawl] snapshot error for ${url}:`,
                        snapErr.message
                    );
                    errors.push(`Snapshot error for ${url}: ${snapErr.message}`);
                } else {
                    crawledCount++;
                    console.log(`[serverless-crawl] ✓ ${url} (${pageType})`);
                }
            } catch (pageErr) {
                const msg =
                    pageErr instanceof Error ? pageErr.message : String(pageErr);
                console.warn(`[serverless-crawl] Error on ${url}:`, msg);
                errors.push(`Error on ${url}: ${msg}`);
            }
        }

        // 5. Extract and save logo
        const logoUrl = extractLogoUrl(homePage.html, competitorUrl);
        if (logoUrl) {
            await supabase
                .from("competitors")
                .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
                .eq("id", competitorId);
        }

        // 6. Mark job completed
        const completedAt = new Date().toISOString();
        await supabase
            .from("crawl_jobs")
            .update({ status: "completed", completed_at: completedAt })
            .eq("id", jobId);

        // Update competitor last_crawled_at
        await supabase
            .from("competitors")
            .update({
                last_crawled_at: completedAt,
                updated_at: completedAt,
            })
            .eq("id", competitorId);

        console.log(
            `[serverless-crawl] Done: pages=${crawledCount}, errors=${errors.length}`
        );

        // 7. Dispatch notifications (email / Slack)
        try {
            const { data: comp } = await supabase
                .from("competitors")
                .select("name, workspace_id")
                .eq("id", competitorId)
                .single();
            if (comp?.workspace_id) {
                await dispatchNotifications({
                    workspaceId: comp.workspace_id,
                    competitorName: comp.name || competitorUrl,
                    competitorUrl,
                    pagesCount: crawledCount,
                    crawlJobId: jobId,
                });
            }
        } catch (notifyErr) {
            console.warn("[serverless-crawl] Notification dispatch error:", notifyErr);
        }

        return {
            ok: true,
            status: "completed",
            pages: crawledCount,
            errors,
            competitorId,
            crawlJobId: jobId,
        };
    } catch (err) {
        const errorMessage =
            err instanceof Error ? err.message : "Internal crawl error";
        console.error("[serverless-crawl] Fatal:", errorMessage);

        await supabase
            .from("crawl_jobs")
            .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                error_message: errorMessage,
            })
            .eq("id", jobId);

        return {
            ok: false,
            status: "failed",
            pages: crawledCount,
            errors: [...errors, errorMessage],
            competitorId,
            crawlJobId: jobId,
        };
    }
}
