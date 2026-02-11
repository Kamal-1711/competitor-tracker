import crypto from "node:crypto";
import type { SEOPageData } from "./contentCrawler";

export interface DomainKeywordProfile {
  keyword: string;
  frequency: number;
  page_count: number;
  appearance_in_h1: number;
  keyword_weight: number;
}

export interface TopicClusterScore {
  cluster_name: string;
  cluster_score: number;
}

export interface ContentGapResult {
  gap_severity: "Low" | "Moderate" | "High";
  keyword_gaps: string[];
  cluster_gaps: string[];
  dominant_competitor_keywords: string[];
  funnel_imbalance: string | null;
  executive_summary_lines: string[];
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "their",
  "have",
  "will",
  "about",
  "are",
  "our",
  "you",
  "to",
  "of",
  "in",
  "on",
  "at",
  "as",
  "an",
  "a",
  "or",
  "be",
  "is",
  "it",
]);

const TOPIC_MAP: Record<string, string[]> = {
  CLOUD: ["cloud", "migration", "aws", "azure"],
  TRANSFORMATION: ["transformation", "modernization", "digital"],
  ENTERPRISE: ["enterprise", "governance", "scale"],
  SECURITY: ["security", "compliance", "risk"],
  FINTECH: ["banking", "payments", "finance"],
};

const TOFU_PHRASES = ["what is", "guide", "how to"];
const MOFU_PHRASES = ["compare", "best", "vs"];
const BOFU_PHRASES = ["pricing", "demo", "buy"];

const keywordCache = new Map<string, DomainKeywordProfile[]>();

function stableKey(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\d+/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function buildNgrams(tokens: string[]): string[] {
  const grams: string[] = [];
  for (let n = 1; n <= 3; n += 1) {
    for (let i = 0; i <= tokens.length - n; i += 1) {
      grams.push(tokens.slice(i, i + n).join(" "));
    }
  }
  return grams;
}

function parseSlug(url: string): string {
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").filter(Boolean).pop() ?? "";
    return seg.replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

function compactText(page: SEOPageData): { all: string; h1: string } {
  const slug = parseSlug(page.url);
  const all = [
    page.h1,
    ...(page.h2 ?? []),
    ...(page.h3 ?? []),
    page.meta_title,
    ...(page.anchor_text ?? []),
    slug,
  ]
    .filter(Boolean)
    .join(" ");
  return { all, h1: page.h1 ?? "" };
}

export function extractDomainKeywordProfile(params: {
  domainId: string;
  pages: SEOPageData[];
}): DomainKeywordProfile[] {
  const seed = `${params.domainId}:${params.pages.map((p) => p.url).sort().join("|")}`;
  const cacheKey = stableKey(seed);
  const cached = keywordCache.get(cacheKey);
  if (cached) return cached;

  const frequency = new Map<string, number>();
  const pageCount = new Map<string, number>();
  const h1Appearance = new Map<string, number>();

  for (const page of params.pages) {
    const { all, h1 } = compactText(page);
    const tokens = tokenize(all);
    const grams = buildNgrams(tokens);

    for (const gram of grams) {
      frequency.set(gram, (frequency.get(gram) ?? 0) + 1);
    }

    const uniqueGrams = new Set(grams);
    for (const gram of uniqueGrams) {
      pageCount.set(gram, (pageCount.get(gram) ?? 0) + 1);
    }

    const h1Tokens = tokenize(h1);
    const h1Grams = new Set(buildNgrams(h1Tokens));
    for (const gram of h1Grams) {
      h1Appearance.set(gram, (h1Appearance.get(gram) ?? 0) + 1);
    }
  }

  const profile: DomainKeywordProfile[] = Array.from(frequency.entries())
    .map(([keyword, freq]) => {
      const pages = pageCount.get(keyword) ?? 0;
      const h1Count = h1Appearance.get(keyword) ?? 0;
      const keyword_weight = freq * 1.5 + pages * 2 + h1Count * 3;
      return {
        keyword,
        frequency: freq,
        page_count: pages,
        appearance_in_h1: h1Count,
        keyword_weight: Number(keyword_weight.toFixed(2)),
      };
    })
    .sort((a, b) => b.keyword_weight - a.keyword_weight)
    .slice(0, 100);

  keywordCache.set(cacheKey, profile);
  return profile;
}

export function mapKeywordClusters(profile: DomainKeywordProfile[]): TopicClusterScore[] {
  const scores: TopicClusterScore[] = Object.entries(TOPIC_MAP)
    .map(([cluster_name, terms]) => {
      const cluster_score = profile.reduce((sum, kw) => {
        const matched = terms.some((term) => kw.keyword.includes(term));
        return matched ? sum + kw.keyword_weight : sum;
      }, 0);
      return { cluster_name, cluster_score: Number(cluster_score.toFixed(2)) };
    })
    .filter((c) => c.cluster_score > 0)
    .sort((a, b) => b.cluster_score - a.cluster_score)
    .slice(0, 5);

  return scores;
}

function funnelCounts(profile: DomainKeywordProfile[]): { tofu: number; mofu: number; bofu: number } {
  let tofu = 0;
  let mofu = 0;
  let bofu = 0;
  for (const kw of profile) {
    const text = kw.keyword;
    if (TOFU_PHRASES.some((p) => text.includes(p))) tofu += kw.frequency;
    if (MOFU_PHRASES.some((p) => text.includes(p))) mofu += kw.frequency;
    if (BOFU_PHRASES.some((p) => text.includes(p))) bofu += kw.frequency;
  }
  return { tofu, mofu, bofu };
}

function summarizeFunnelImbalance(
  target: { tofu: number; mofu: number; bofu: number },
  competitor: { tofu: number; mofu: number; bofu: number }
): string | null {
  const deltaTofu = competitor.tofu - target.tofu;
  const deltaMofu = competitor.mofu - target.mofu;
  const deltaBofu = competitor.bofu - target.bofu;
  const threshold = 8;
  if (deltaMofu > threshold) return "Mid-funnel comparison content appears stronger in competitor coverage.";
  if (deltaBofu > threshold) return "Bottom-funnel conversion-oriented content appears stronger in competitor coverage.";
  if (deltaTofu > threshold) return "Top-funnel educational content appears stronger in competitor coverage.";
  return null;
}

export function findContentGaps(params: {
  targetDomainProfile: DomainKeywordProfile[];
  competitorProfile: DomainKeywordProfile[];
  targetClusters: TopicClusterScore[];
  competitorClusters: TopicClusterScore[];
}): ContentGapResult {
  const targetMap = new Map(params.targetDomainProfile.map((k) => [k.keyword, k]));
  const competitorSorted = [...params.competitorProfile].sort((a, b) => b.keyword_weight - a.keyword_weight);

  const keyword_gaps = competitorSorted
    .filter((kw) => {
      const target = targetMap.get(kw.keyword);
      const targetWeight = target?.keyword_weight ?? 0;
      return kw.keyword_weight >= 18 && targetWeight <= kw.keyword_weight * 0.35;
    })
    .slice(0, 5)
    .map((k) => k.keyword);

  const targetClusterMap = new Map(params.targetClusters.map((c) => [c.cluster_name, c.cluster_score]));
  const cluster_gaps = params.competitorClusters
    .filter((cluster) => {
      const targetScore = targetClusterMap.get(cluster.cluster_name) ?? 0;
      return cluster.cluster_score >= 20 && targetScore <= cluster.cluster_score * 0.45;
    })
    .slice(0, 3)
    .map((c) => c.cluster_name);

  const dominant_competitor_keywords = competitorSorted
    .slice(0, 5)
    .map((k) => k.keyword);

  const funnel_imbalance = summarizeFunnelImbalance(
    funnelCounts(params.targetDomainProfile),
    funnelCounts(params.competitorProfile)
  );

  let gap_severity: "Low" | "Moderate" | "High" = "Low";
  const weightedGap = keyword_gaps.length + cluster_gaps.length * 2 + (funnel_imbalance ? 1 : 0);
  if (weightedGap >= 6) gap_severity = "High";
  else if (weightedGap >= 3) gap_severity = "Moderate";

  const topCluster = params.competitorClusters[0]?.cluster_name ?? "key strategic topics";
  const topKeywords = dominant_competitor_keywords.slice(0, 2);
  const summaryLines: string[] = [
    `Competitor demonstrates stronger emphasis on ${topCluster.toLowerCase()} content themes.`,
    topKeywords.length > 0
      ? `Dominant keyword concentration includes ${topKeywords.join(", ")}.`
      : "Dominant keyword concentration is present but still stabilizing from current crawl data.",
    funnel_imbalance
      ? `Funnel distribution indicates ${funnel_imbalance.toLowerCase()}`
      : "Funnel distribution appears broadly balanced relative to current comparison inputs.",
    cluster_gaps.length > 0
      ? `Topic exposure gap is most visible in ${cluster_gaps.join(", ")}.`
      : "No major topic exposure gap is currently visible across the tracked cluster set.",
    "Consider evaluating strategic coverage in these areas.",
  ].slice(0, 5);

  return {
    gap_severity,
    keyword_gaps,
    cluster_gaps,
    dominant_competitor_keywords,
    funnel_imbalance,
    executive_summary_lines: summaryLines,
  };
}

