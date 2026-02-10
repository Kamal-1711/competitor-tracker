import * as cheerio from "cheerio";
import { classifyChange, type ChangeCategory } from "./classifyChange";
import type { PageType } from "@/lib/PAGE_TAXONOMY";
export type { PageType } from "@/lib/PAGE_TAXONOMY";

export type ChangeType =
  | "text_change"
  | "element_added"
  | "element_removed"
  | "cta_text_change"
  | "nav_change";

export interface ChangeReference {
  /**
   * Optional stable-ish key used for matching the same item across snapshots.
   * Example: nav/cta href + normalized text.
   */
  key?: string;
  /**
   * Human-friendly label for display.
   */
  label?: string;
  /**
   * URL for CTA/nav items.
   */
  href?: string;
  /**
   * Raw/normalized text used in comparisons.
   */
  text?: string;
}

export interface DetectedChange {
  changeType: ChangeType;
  pageUrl: string;
  pageType: PageType;
  summary: string;
  category: ChangeCategory;
  before?: ChangeReference;
  after?: ChangeReference;
  details: Record<string, unknown>;
}

export interface DetectChangesInput {
  beforeHtml: string;
  afterHtml: string;
  pageUrl: string;
  pageType: PageType;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeText(input: string): string {
  return normalizeWhitespace(input).toLowerCase();
}

function stripNonContent($: cheerio.CheerioAPI) {
  $("script,noscript,style,template").remove();
}

function getVisibleTextFingerprint($: cheerio.CheerioAPI): string {
  const bodyText = $("body").text();
  return normalizeText(bodyText);
}

function extractNavItems($: cheerio.CheerioAPI, baseUrl: string) {
  const items: Array<{ key: string; href: string; text: string }> = [];

  const candidates = $("nav a[href], header nav a[href], header a[href]")
    .toArray()
    .slice(0, 200); // keep deterministic cap

  for (const el of candidates) {
    const hrefRaw = $(el).attr("href") ?? "";
    const textRaw = $(el).text();
    const text = normalizeWhitespace(textRaw);
    if (!text || text.length < 2) continue;

    const href = resolveHref(baseUrl, hrefRaw);
    if (!href) continue;

    const key = `${href}::${normalizeText(text)}`;
    items.push({ key, href, text });
  }

  return dedupeByKey(items);
}

function extractCtas($: cheerio.CheerioAPI, baseUrl: string) {
  const items: Array<{ key: string; href?: string; text: string; tag: string }> = [];

  const candidates = $("a[href], button, [role='button'], input[type='submit'], input[type='button']")
    .toArray()
    .slice(0, 500);

  for (const el of candidates) {
    const tag = el.tagName?.toLowerCase?.() ?? "unknown";

    let textRaw = "";
    if (tag === "input") {
      textRaw = ($(el).attr("value") ?? "").toString();
    } else {
      textRaw = $(el).text();
    }

    const text = normalizeWhitespace(textRaw);
    if (!text || text.length < 2) continue;

    const hrefRaw = $(el).attr("href") ?? undefined;
    const href = hrefRaw ? resolveHref(baseUrl, hrefRaw) ?? undefined : undefined;

    // If there is an href, it is more stable. Otherwise key on tag + text.
    const key = href ? `href:${href}::${normalizeText(text)}` : `cta:${tag}::${normalizeText(text)}`;
    items.push({ key, href, text, tag });
  }

  return dedupeByKey(items);
}

function extractStructuralElements($: cheerio.CheerioAPI) {
  // Deterministic, coarse structural representation of important content blocks.
  // We avoid full DOM pathing to reduce noise; instead include headings + list items + section/article landmarks.
  const entries: string[] = [];

  const headingEls = $("h1,h2,h3").toArray().slice(0, 200);
  for (const el of headingEls) {
    const tag = el.tagName.toLowerCase();
    const text = normalizeWhitespace($(el).text());
    if (!text) continue;
    entries.push(`heading:${tag}:${normalizeText(text)}`);
  }

  const sectionEls = $("main section, main article, section, article").toArray().slice(0, 200);
  for (const el of sectionEls) {
    const tag = el.tagName.toLowerCase();
    const aria = normalizeText($(el).attr("aria-label") ?? "");
    const id = normalizeText($(el).attr("id") ?? "");
    const cls = normalizeText(($(el).attr("class") ?? "").split(/\s+/)[0] ?? "");
    const key = `block:${tag}:${aria || id || cls || "unknown"}`;
    entries.push(key);
  }

  const listItems = $("main li").toArray().slice(0, 400);
  for (const el of listItems) {
    const text = normalizeWhitespace($(el).text());
    if (!text) continue;
    // keep first N chars to avoid huge values
    entries.push(`li:${normalizeText(text).slice(0, 120)}`);
  }

  return uniqueSorted(entries);
}

function resolveHref(baseUrl: string, hrefRaw: string): string | null {
  const href = hrefRaw.trim();
  if (!href) return null;
  if (href.startsWith("#")) return null;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function uniqueSorted(items: string[]): string[] {
  return Array.from(new Set(items)).sort();
}

function dedupeByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push(item);
  }
  return out;
}

function diffSets(before: string[], after: string[]) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added: string[] = [];
  const removed: string[] = [];

  for (const a of after) if (!beforeSet.has(a)) added.push(a);
  for (const b of before) if (!afterSet.has(b)) removed.push(b);

  return { added, removed };
}

function summarizeList(items: string[], limit: number): string[] {
  if (items.length <= limit) return items;
  return [...items.slice(0, limit), `… (+${items.length - limit} more)`];
}

/**
 * Deterministic change detection between two HTML documents.
 */
export function detectChanges(input: DetectChangesInput): DetectedChange[] {
  const before$ = cheerio.load(input.beforeHtml);
  const after$ = cheerio.load(input.afterHtml);

  stripNonContent(before$);
  stripNonContent(after$);

  const changes: DetectedChange[] = [];

  // 1) Text changes (global fingerprint)
  const beforeText = getVisibleTextFingerprint(before$);
  const afterText = getVisibleTextFingerprint(after$);
  if (beforeText !== afterText) {
    const beforeLen = beforeText.length;
    const afterLen = afterText.length;
    const change: DetectedChange = {
      changeType: "text_change",
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      summary: "Page text content changed",
      category: "Navigation / Structure", // Will be overridden by classifyChange
      before: { text: beforeText.slice(0, 500) },
      after: { text: afterText.slice(0, 500) },
      details: {
        beforeLength: beforeLen,
        afterLength: afterLen,
      },
    };
    change.category = classifyChange(change, input.afterHtml);
    changes.push(change);
  }

  // 2) Element additions/removals (coarse structure)
  const beforeStructure = extractStructuralElements(before$);
  const afterStructure = extractStructuralElements(after$);
  const structDiff = diffSets(beforeStructure, afterStructure);

  for (const added of structDiff.added.slice(0, 25)) {
    const change: DetectedChange = {
      changeType: "element_added",
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      summary: "Element/block added",
      category: "Navigation / Structure", // Will be overridden by classifyChange
      after: { key: added, label: added },
      details: { elementKey: added },
    };
    change.category = classifyChange(change, input.afterHtml);
    changes.push(change);
  }
  for (const removed of structDiff.removed.slice(0, 25)) {
    const change: DetectedChange = {
      changeType: "element_removed",
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      summary: "Element/block removed",
      category: "Navigation / Structure", // Will be overridden by classifyChange
      before: { key: removed, label: removed },
      details: { elementKey: removed },
    };
    change.category = classifyChange(change, input.afterHtml);
    changes.push(change);
  }

  if (structDiff.added.length > 25 || structDiff.removed.length > 25) {
    const change: DetectedChange = {
      changeType: "element_added",
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      summary: "Many structural changes detected",
      category: "Navigation / Structure", // Will be overridden by classifyChange
      details: {
        added: summarizeList(structDiff.added, 10),
        removed: summarizeList(structDiff.removed, 10),
      },
    };
    change.category = classifyChange(change, input.afterHtml);
    changes.push(change);
  }

  // 3) CTA changes
  const beforeCtas = extractCtas(before$, input.pageUrl);
  const afterCtas = extractCtas(after$, input.pageUrl);

  // Match by href first (if present), otherwise by normalized text key.
  const beforeByHref = new Map<string, typeof beforeCtas[number]>();
  for (const cta of beforeCtas) if (cta.href) beforeByHref.set(cta.href, cta);

  for (const afterCta of afterCtas) {
    if (!afterCta.href) continue;
    const beforeCta = beforeByHref.get(afterCta.href);
    if (!beforeCta) continue;
    if (normalizeText(beforeCta.text) !== normalizeText(afterCta.text)) {
      const change: DetectedChange = {
        changeType: "cta_text_change",
        pageUrl: input.pageUrl,
        pageType: input.pageType,
        summary: `CTA text changed for ${afterCta.href}`,
        category: "Navigation / Structure", // Will be overridden by classifyChange
        before: { key: `href:${afterCta.href}`, href: afterCta.href, text: beforeCta.text, label: beforeCta.text },
        after: { key: `href:${afterCta.href}`, href: afterCta.href, text: afterCta.text, label: afterCta.text },
        details: { href: afterCta.href, beforeText: beforeCta.text, afterText: afterCta.text },
      };
      change.category = classifyChange(change, input.afterHtml);
      changes.push(change);
    }
  }

  // 4) Navigation changes
  const beforeNav = extractNavItems(before$, input.pageUrl);
  const afterNav = extractNavItems(after$, input.pageUrl);
  const navDiff = diffSets(
    beforeNav.map((i) => i.key),
    afterNav.map((i) => i.key)
  );

  if (navDiff.added.length || navDiff.removed.length) {
    const change: DetectedChange = {
      changeType: "nav_change",
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      summary: "Navigation changed",
      category: "Navigation / Structure", // Will be overridden by classifyChange
      details: {
        added: summarizeList(navDiff.added, 20),
        removed: summarizeList(navDiff.removed, 20),
      },
    };
    change.category = classifyChange(change, input.afterHtml);
    changes.push(change);
  }

  return changes;
}

