import type { SEOPageData } from "./contentCrawler";

export interface FunnelDistribution {
  top_of_funnel: number;
  mid_of_funnel: number;
  bottom_of_funnel: number;
}

const TOFU_PATTERNS = [/what is/i, /guide/i, /how to/i, /introduction/i];
const MOFU_PATTERNS = [/compare/i, /\bvs\b/i, /best/i, /alternatives?/i];
const BOFU_PATTERNS = [/pricing/i, /demo/i, /contact sales/i, /case stud(y|ies)/i];

export type FunnelStage = "top" | "mid" | "bottom" | "unknown";

export function classifyPageFunnel(page: SEOPageData): FunnelStage {
  const text = [page.h1, page.meta_title, ...(page.h2 ?? []), page.url]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (BOFU_PATTERNS.some((re) => re.test(text))) return "bottom";
  if (MOFU_PATTERNS.some((re) => re.test(text))) return "mid";
  if (TOFU_PATTERNS.some((re) => re.test(text))) return "top";
  return "unknown";
}

export function computeFunnelDistribution(pages: SEOPageData[]): FunnelDistribution {
  let top = 0;
  let mid = 0;
  let bottom = 0;

  for (const page of pages) {
    const stage = classifyPageFunnel(page);
    if (stage === "top") top += 1;
    else if (stage === "mid") mid += 1;
    else if (stage === "bottom") bottom += 1;
  }

  return {
    top_of_funnel: top,
    mid_of_funnel: mid,
    bottom_of_funnel: bottom,
  };
}

