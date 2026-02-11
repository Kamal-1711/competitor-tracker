import type { AboutSnapshot, BaselineEvidence, IndustryProfile } from "./types";
import type { SnapshotSignal } from "@/lib/intelligence-engine";

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  FINTECH: ["banking", "payments", "fintech", "financial services"],
  HEALTHCARE: ["hospital", "healthcare", "clinical"],
  SAAS: ["platform", "cloud", "software", "saas"],
  CONSULTING: ["advisory", "consulting", "transformation"],
  "E-COMMERCE": ["retail", "marketplace", "online store", "ecommerce"],
};

const INDUSTRY_LABELS: Record<string, string> = {
  FINTECH: "Fintech",
  HEALTHCARE: "Healthcare",
  SAAS: "SaaS",
  CONSULTING: "Consulting",
  "E-COMMERCE": "E-commerce",
};

type TextSources = {
  about: AboutSnapshot;
  homepage: SnapshotSignal | null;
  services: SnapshotSignal | null;
};

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

function countKeywords(text: string, keywords: string[]): number {
  let score = 0;
  for (const k of keywords) {
    if (!k) continue;
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "gi");
    const matches = text.match(re);
    if (matches) score += matches.length;
  }
  return score;
}

export function classifyIndustry(sources: TextSources): IndustryProfile {
  const evidence: BaselineEvidence[] = [];
  const textParts: string[] = [];

  if (sources.about.company_summary_raw) {
    textParts.push(sources.about.company_summary_raw);
    evidence.push({
      source: "about",
      key: "company_summary_raw",
      value: sources.about.company_summary_raw,
    });
  }
  if (sources.homepage?.h1_text) {
    textParts.push(sources.homepage.h1_text);
    evidence.push({ source: "homepage", key: "h1_text", value: sources.homepage.h1_text });
  }
  if (sources.homepage?.title) {
    textParts.push(sources.homepage.title);
    evidence.push({ source: "homepage", key: "title", value: sources.homepage.title });
  }
  if (sources.homepage?.h2_headings?.length) {
    textParts.push(sources.homepage.h2_headings.join(" "));
    evidence.push({
      source: "homepage",
      key: "h2_headings",
      value: sources.homepage.h2_headings.slice(0, 5),
    });
  }
  if (sources.services?.h2_headings?.length) {
    textParts.push(sources.services.h2_headings.join(" "));
    evidence.push({
      source: "services",
      key: "h2_headings",
      value: sources.services.h2_headings.slice(0, 5),
    });
  }
  if (sources.services?.h3_headings?.length) {
    textParts.push(sources.services.h3_headings.join(" "));
    evidence.push({
      source: "services",
      key: "h3_headings",
      value: sources.services.h3_headings.slice(0, 5),
    });
  }
  if (sources.services?.title) {
    textParts.push(sources.services.title);
    evidence.push({ source: "services", key: "title", value: sources.services.title });
  }

  const combined = normalize(textParts.join(" ").replace(/\s+/g, " ").trim());

  const scores: Array<{ key: string; score: number }> = [];
  for (const [key, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    scores.push({ key, score: countKeywords(combined, keywords) });
  }

  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];

  let primary_industry: string | null = null;
  const secondary_industries: string[] = [];

  if (top && top.score > 0) {
    primary_industry = INDUSTRY_LABELS[top.key] ?? top.key;
  }

  for (const s of scores.slice(1)) {
    if (s.score > 0) {
      secondary_industries.push(INDUSTRY_LABELS[s.key] ?? s.key);
    }
  }

  let industry_confidence: IndustryProfile["industry_confidence"] = "Low";
  if (!top || top.score === 0) {
    industry_confidence = "Low";
  } else if (!second || top.score >= second.score + 2) {
    industry_confidence = "High";
  } else {
    industry_confidence = "Medium";
  }

  evidence.push({
    source: "snapshot",
    key: "industry_scores",
    value: scores,
  });

  return {
    primary_industry,
    secondary_industries,
    industry_confidence,
    ruleId: "BP-IND-001",
    evidence,
  };
}

