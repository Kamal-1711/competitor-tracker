import * as cheerio from "cheerio";
import { type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { emitBlogNewPost } from "@/lib/realtime/socketEvents";

// Helper to normalize strings
function clean(text: string | null | undefined): string | null {
    if (!text) return null;
    return text.replace(/\s+/g, " ").trim() || null;
}

function computeHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
}

function resolveUrl(relative: string, base: string): string | null {
    try {
        return new URL(relative, base).toString();
    } catch {
        return null;
    }
}

export async function extractAndPersistBlogPosts(
    html: string,
    pageUrl: string,
    competitorId: string,
    supabase: SupabaseClient
) {
    const $ = cheerio.load(html);
    console.log(`[BlogExtractor] Starting extraction for ${pageUrl}. HTML length: ${html.length}`);

    const extractedPosts = new Map<string, { title: string; url: string; date?: string; image?: string }>();

    // Helper to clean text
    const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();

    // Strategy 1: Look for specific semantic containers (article, .post, etc)
    const semanticSelectors = [
        "article",
        ".post",
        ".blog-post",
        ".card",
        ".entry",
        ".news-item",
        "div[class*='post']",
        "div[class*='blog']",
        "li"
    ];

    $(semanticSelectors.join(", ")).each((_, el) => {
        const $el = $(el);
        // Heuristic: Must have a link and some text
        const link = $el.find("a").first();
        const titleCandidate = $el.find("h2, h3, h4, h5, h6").first();

        if (link.length > 0) {
            let title = cleanText(titleCandidate.text());
            if (!title) title = cleanText(link.text());

            const href = link.attr("href");
            if (title.length > 10 && href) {
                // Basic validation: ignore tiny titles
                extractedPosts.set(href, { title, url: href });
            }
        }
    });

    // Strategy 2: structural pattern matching (if we missed things)
    const linkCandidates: cheerio.Cheerio<any>[] = [];

    $("a").each((i, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        const text = cleanText($a.text());

        if (!href || href.startsWith("#") || href.startsWith("javascript") || text.length < 10) return;

        const blocklist = /contact|about|home|login|sign|privacy|terms|policy|sitemap|profile|mission|vision|leadership|management|history|milestones|sustainability|careers|investor|support|faq|manual|help|cookies|security|admin|pricing|features|product|demo/i;
        if (blocklist.test(text)) return;

        if ($a.closest("nav, header, footer").length > 0) return;
        linkCandidates.push($a);
    });

    for (const $a of linkCandidates) {
        const href = $a.attr("href")!;
        let fullUrl = resolveUrl(href, pageUrl);
        if (!fullUrl) continue;

        let title = cleanText($a.text());
        if (title.length < 15) {
            const prevHeading = $a.prev("h2, h3, h4, h5, h6");
            if (prevHeading.length > 0) title = cleanText(prevHeading.text());
        }
        if (title.length < 15) {
            const parentHeading = $a.closest("div, li").find("h1, h2, h3, h4").first();
            if (parentHeading.length > 0) title = cleanText(parentHeading.text());
        }

        if (title.length > 10 && !extractedPosts.has(fullUrl)) {
            extractedPosts.set(fullUrl, { title, url: fullUrl });
        }
    }

    const posts = Array.from(extractedPosts.values());
    const finalPosts = [];
    const seenUrls = new Set<string>();

    for (const postCandidate of posts) {
        let absUrl = resolveUrl(postCandidate.url, pageUrl);
        if (!absUrl) continue;

        if (absUrl.includes("#")) absUrl = absUrl.split("#")[0];
        if (seenUrls.has(absUrl)) continue;

        // Skip current page or landing pages
        if (absUrl.replace(/\/$/, '') === pageUrl.replace(/\/$/, '')) continue;
        const urlObj = new URL(absUrl);
        const path = urlObj.pathname.replace(/\/$/, '');
        if (['/blog', '/news', '/insights', '/updates', '/press', '/articles', '/resources', '/blogposts', '/newsroom'].includes(path)) continue;

        // Skip external
        try {
            const pageHost = new URL(pageUrl).hostname.replace(/^www\./, '');
            const urlHost = urlObj.hostname.replace(/^www\./, '');
            if (!urlHost.includes(pageHost)) continue;
        } catch { continue; }

        const urlLower = absUrl.toLowerCase();
        if (/(pricing|product|feature|contact|about|legal|terms|policy|login|signup|cart|checkout|my-account|careers|jobs|serving)/i.test(urlLower)) continue;

        const isBlogUrl = /\/(blog|news|insights|updates|press|articles|resources|media|knowledge-?center|posts|blogposts|newsroom)(\/|$)/.test(urlLower) ||
            /\/\d{4}\/\d{2}\//.test(urlLower) ||
            /-p-\d+\.html$/.test(urlLower);

        const $link = $(`a[href="${postCandidate.url}"], a[href="${absUrl}"]`).first();
        const $card = $link.closest("article, .post, .blog-post, .card, .entry, .news-item, li, div");

        let title = cleanText(postCandidate.title);
        const heading = $card.find("h1, h2, h3, h4, h5, h6").first();
        if (heading.length > 0) {
            const hText = cleanText(heading.text());
            if (hText.length > title.length) title = hText;
        }

        let excerpt: string | null = null;
        const p = $card.find("p").filter((_, el) => {
            const t = $(el).text().trim();
            return t.length > 20 && !/read more|learn more|continue reading|posted on|by /i.test(t);
        }).first();
        if (p.length > 0) excerpt = cleanText(p.text());

        let publishDate: string | null = null;
        const time = $card.find("time").first();
        if (time.length > 0) {
            publishDate = time.attr("datetime") || time.text();
        } else {
            const dr = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}(?:st|nd|rd|th)?,? \d{4}|\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{4}|\d{4}-\d{2}-\d{2}/i;
            const m = $card.text().match(dr);
            if (m) publishDate = m[0];
        }

        const wordCount = title.split(/\s+/).length;
        if (wordCount < 3) continue;

        const titleBlocklist = /\b(contact|about|serve|who we are|profile|mission|vision|leadership|history|returns|annual|legal|terms|privacy|cookie|read more|learn more|continue reading|click here|get started|demo|start today|restatement|stress-free)\b/i;
        if (titleBlocklist.test(title)) continue;

        const isSemantic = $card.is("article") || $card.hasClass("post") || $card.hasClass("blog-post") || $card.hasClass("entry");
        const hasContentSignal = !!excerpt || !!publishDate || /Reading Time/i.test($card.text());

        if (isBlogUrl) {
            if (wordCount < 4 && !hasContentSignal) {
                if (wordCount < 5) continue;
            }
        } else {
            if (!isSemantic || !hasContentSignal) continue;
        }

        seenUrls.add(absUrl);
        finalPosts.push({
            title,
            url: absUrl,
            excerpt,
            publishDate,
            contentHash: computeHash(title + absUrl)
        });
    }

    console.log(`[BlogExtractor] Extracted ${finalPosts.length} posts from ${pageUrl}`);

    for (const post of finalPosts.slice(0, 20)) {
        try {
            const { data: existing } = await supabase.from("blog_posts")
                .select("id")
                .eq("competitor_id", competitorId)
                .eq("url", post.url)
                .maybeSingle();

            if (!existing) {
                const d = post.publishDate ? new Date(post.publishDate) : null;
                const validDate = d && !isNaN(d.getTime());

                await supabase.from("blog_posts").insert({
                    competitor_id: competitorId,
                    title: post.title,
                    url: post.url,
                    publish_date: validDate ? d!.toISOString() : null,
                    excerpt: post.excerpt,
                    content_hash: post.contentHash
                });

                await supabase.from("changes").insert({
                    competitor_id: competitorId,
                    change_type: "new_blog_post",
                    category: "content",
                    summary: `New blog post: ${post.title}`,
                    impact_level: "low"
                });

                await emitBlogNewPost({
                    competitorId,
                    postTitle: post.title,
                    url: post.url
                });
                console.log(`[BlogExtractor] Saved: ${post.title}`);
            } else {
                await supabase.from("blog_posts").update({ last_seen_at: new Date().toISOString() }).eq("id", existing.id);
            }
        } catch (e) {
            console.error(`[BlogExtractor] Save error:`, e);
        }
    }
}
