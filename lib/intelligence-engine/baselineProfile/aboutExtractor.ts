import type { SnapshotSignal } from "@/lib/intelligence-engine";
import type { AboutSnapshot, BaselineEvidence } from "./types";

const REGION_KEYWORDS: Record<string, string[]> = {
  "North America": ["north america", "united states", "usa", "canada"],
  Europe: ["europe", "uk", "united kingdom", "germany", "france", "eu"],
  APAC: ["asia pacific", "apac", "singapore", "australia", "india"],
};

const SIZE_SIGNALS: string[] = ["global", "enterprise", "startup", "scale-up", "mid-market", "small team"];

function extractFoundingYear(text: string): number | null {
  const matches = text.match(/\b(18[5-9]\d|19\d{2}|20[0-2]\d)\b/);
  if (!matches) return null;
  return Number(matches[0]);
}

function detectRegions(text: string): string[] {
  const lowered = text.toLowerCase();
  const regions: string[] = [];
  for (const [label, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((k) => lowered.includes(k))) regions.push(label);
  }
  return Array.from(new Set(regions));
}

function detectMissionKeywords(text: string): string[] {
  const lowered = text.toLowerCase();
  const keys: string[] = [];
  if (lowered.includes("mission")) keys.push("mission");
  if (lowered.includes("vision")) keys.push("vision");
  if (lowered.includes("purpose")) keys.push("purpose");
  return keys;
}

function detectCompanySizeSignals(text: string): string[] {
  const lowered = text.toLowerCase();
  const hits = SIZE_SIGNALS.filter((s) => lowered.includes(s.toLowerCase()));
  return Array.from(new Set(hits));
}

export function extractAboutSnapshot(params: {
  homepage: SnapshotSignal | null;
  aboutLikePage: SnapshotSignal | null;
}): AboutSnapshot {
  const evidence: BaselineEvidence[] = [];

  const homepageTextParts: string[] = [];
  if (params.homepage?.h1_text) {
    homepageTextParts.push(params.homepage.h1_text);
    evidence.push({
      source: "homepage",
      key: "h1_text",
      value: params.homepage.h1_text,
    });
  }
  if (params.homepage?.h2_headings?.length) {
    homepageTextParts.push(params.homepage.h2_headings.join(" "));
    evidence.push({
      source: "homepage",
      key: "h2_headings",
      value: params.homepage.h2_headings.slice(0, 5),
    });
  }

  const aboutTextParts: string[] = [];
  if (params.aboutLikePage?.h1_text) {
    aboutTextParts.push(params.aboutLikePage.h1_text);
    evidence.push({
      source: "about",
      key: "h1_text",
      value: params.aboutLikePage.h1_text,
    });
  }
  if (params.aboutLikePage?.h2_headings?.length) {
    aboutTextParts.push(params.aboutLikePage.h2_headings.join(" "));
    evidence.push({
      source: "about",
      key: "h2_headings",
      value: params.aboutLikePage.h2_headings.slice(0, 5),
    });
  }
  if (params.aboutLikePage?.list_items?.length) {
    aboutTextParts.push(params.aboutLikePage.list_items.join(" "));
    evidence.push({
      source: "about",
      key: "list_items",
      value: params.aboutLikePage.list_items.slice(0, 5),
    });
  }

  const combined = [...aboutTextParts, ...homepageTextParts].join(" ").replace(/\s+/g, " ").trim();
  const company_summary_raw = combined || null;

  const founding_year = company_summary_raw ? extractFoundingYear(company_summary_raw) : null;
  if (founding_year) {
    evidence.push({
      source: params.aboutLikePage ? "about" : "homepage",
      key: "founding_year",
      value: founding_year,
    });
  }

  const detected_regions = company_summary_raw ? detectRegions(company_summary_raw) : [];
  const mission_keywords = company_summary_raw ? detectMissionKeywords(company_summary_raw) : [];
  const company_size_signals = company_summary_raw ? detectCompanySizeSignals(company_summary_raw) : [];

  return {
    company_summary_raw,
    founding_year,
    detected_regions,
    mission_keywords,
    company_size_signals,
    ruleId: "BP-ABOUT-001",
    evidence,
  };
}

