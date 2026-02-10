import * as cheerio from "cheerio";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";

export type PmSignalChangeType =
  | "homepage_headline_change"
  | "cta_text_change"
  | "pricing_structure_change"
  | "product_service_section_change"
  | "nav_items_change"
  | "case_study_or_customer_logo_added";

export interface PmSignalDiff {
  page_type: PageType;
  change_type: PmSignalChangeType;
  before_value: string | string[] | null;
  after_value: string | string[] | null;
  confidence: "High" | "Medium";
}

export interface PmSignalSnapshotInput {
  pageType: PageType;
  primaryHeadline: string | null;
  primaryCtaText: string | null;
  navItems: string[];
  html: string;
}

export interface DetectPmSignalChangesInput {
  beforeSnapshot: PmSignalSnapshotInput;
  afterSnapshot: PmSignalSnapshotInput;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s$%.-]/g, "")
    .trim();
}

function normalizeArray(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].sort();
}

function stripFooterAndNoise(html: string): string {
  const $ = cheerio.load(html);
  $("script,noscript,style,template,footer").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function extractPriceSignals(text: string): string[] {
  const lowered = text.toLowerCase();
  const matches = lowered.match(/(\$|usd\s*)\s?\d+[.,]?\d*/g) ?? [];
  return matches.map((m) => m.replace(/\s+/g, "")).sort();
}

function extractPlanSignals(html: string): string[] {
  const $ = cheerio.load(html);
  const labels = new Set<string>();
  $("h1,h2,h3,h4,button,strong,b").each((_, el) => {
    const text = $(el).text().trim();
    const normalized = normalizeText(text);
    if (!normalized) return;
    if (/(plan|pricing|starter|pro|business|enterprise|package|tier)/i.test(text)) {
      labels.add(normalized);
    }
  });
  return [...labels].sort();
}

function extractProductSectionSignals(html: string): string[] {
  const $ = cheerio.load(html);
  const sections = new Set<string>();
  $("main h2, main h3, section h2, section h3").each((_, el) => {
    const normalized = normalizeText($(el).text());
    if (!normalized) return;
    if (/(feature|service|solution|capability|offering|platform)/i.test(normalized)) {
      sections.add(normalized);
    }
  });
  return [...sections].sort();
}

function containsCaseStudyOrLogoAdditions(beforeHtml: string, afterHtml: string): string[] {
  const before = normalizeText(stripFooterAndNoise(beforeHtml));
  const after = normalizeText(stripFooterAndNoise(afterHtml));
  const additions: string[] = [];

  const caseStudyKeywords = ["case study", "customer story", "success story", "trusted by", "client"];
  for (const keyword of caseStudyKeywords) {
    if (!before.includes(keyword) && after.includes(keyword)) {
      additions.push(keyword);
    }
  }

  const beforeLogoCount = (before.match(/\blogo\b/g) ?? []).length;
  const afterLogoCount = (after.match(/\blogo\b/g) ?? []).length;
  if (afterLogoCount > beforeLogoCount) additions.push("logo");

  return additions;
}

export function detectPmSignalChanges(input: DetectPmSignalChangesInput): PmSignalDiff[] {
  const { beforeSnapshot, afterSnapshot } = input;
  const pageType = afterSnapshot.pageType;
  const diffs: PmSignalDiff[] = [];

  const beforeNav = normalizeArray(beforeSnapshot.navItems);
  const afterNav = normalizeArray(afterSnapshot.navItems);
  if (beforeNav.join("|") !== afterNav.join("|")) {
    diffs.push({
      page_type: pageType,
      change_type: "nav_items_change",
      before_value: beforeNav,
      after_value: afterNav,
      confidence: "High",
    });
  }

  if (pageType === PAGE_TAXONOMY.HOMEPAGE) {
    const beforeHeadline = normalizeText(beforeSnapshot.primaryHeadline);
    const afterHeadline = normalizeText(afterSnapshot.primaryHeadline);
    if (beforeHeadline && afterHeadline && beforeHeadline !== afterHeadline) {
      diffs.push({
        page_type: pageType,
        change_type: "homepage_headline_change",
        before_value: beforeSnapshot.primaryHeadline,
        after_value: afterSnapshot.primaryHeadline,
        confidence: "High",
      });
    }
  }

  const beforeCta = normalizeText(beforeSnapshot.primaryCtaText);
  const afterCta = normalizeText(afterSnapshot.primaryCtaText);
  if (beforeCta && afterCta && beforeCta !== afterCta) {
    diffs.push({
      page_type: pageType,
      change_type: "cta_text_change",
      before_value: beforeSnapshot.primaryCtaText,
      after_value: afterSnapshot.primaryCtaText,
      confidence: "High",
    });
  }

  if (pageType === PAGE_TAXONOMY.PRICING) {
    const beforeText = stripFooterAndNoise(beforeSnapshot.html);
    const afterText = stripFooterAndNoise(afterSnapshot.html);
    const beforePriceSignals = extractPriceSignals(beforeText);
    const afterPriceSignals = extractPriceSignals(afterText);
    const beforePlanSignals = extractPlanSignals(beforeSnapshot.html);
    const afterPlanSignals = extractPlanSignals(afterSnapshot.html);

    const priceChanged = beforePriceSignals.join("|") !== afterPriceSignals.join("|");
    const planChanged = beforePlanSignals.join("|") !== afterPlanSignals.join("|");
    if (priceChanged || planChanged) {
      diffs.push({
        page_type: pageType,
        change_type: "pricing_structure_change",
        before_value: [...beforePlanSignals, ...beforePriceSignals],
        after_value: [...afterPlanSignals, ...afterPriceSignals],
        confidence: "High",
      });
    }
  }

  if (pageType === PAGE_TAXONOMY.PRODUCT_OR_SERVICES) {
    const beforeSections = extractProductSectionSignals(beforeSnapshot.html);
    const afterSections = extractProductSectionSignals(afterSnapshot.html);
    if (beforeSections.join("|") !== afterSections.join("|")) {
      diffs.push({
        page_type: pageType,
        change_type: "product_service_section_change",
        before_value: beforeSections,
        after_value: afterSections,
        confidence: "Medium",
      });
    }
  }

  if (pageType === PAGE_TAXONOMY.CASE_STUDIES_OR_CUSTOMERS) {
    const additions = containsCaseStudyOrLogoAdditions(beforeSnapshot.html, afterSnapshot.html);
    if (additions.length > 0) {
      diffs.push({
        page_type: pageType,
        change_type: "case_study_or_customer_logo_added",
        before_value: null,
        after_value: additions,
        confidence: "High",
      });
    }
  }

  return diffs;
}
