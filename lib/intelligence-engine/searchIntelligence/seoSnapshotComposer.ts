import crypto from "node:crypto";
import type { SEOPageData } from "./contentCrawler";
import { buildKeywordProfile } from "./keywordExtractor";
import { buildTopicClusters, type TopicCluster } from "./topicClusterEngine";
import {
  computeFunnelDistribution,
  type FunnelDistribution,
} from "./funnelClassifier";
import {
  computeContentDepthMetrics,
  type ContentDepthMetrics,
} from "./contentDepthModel";
import {
  computeSeoDimensions,
  type SEODimensions,
} from "./seoScoringEngine";
import {
  analyzeSeoEvolution,
  type SEOSnapshotRecord,
  type SeoEvolutionResult,
} from "./seoEvolutionEngine";
import {
  extractDomainKeywordProfile,
  mapKeywordClusters,
  findContentGaps,
  type DomainKeywordProfile,
  type TopicClusterScore,
  type ContentGapResult,
} from "./onSiteKeywordEngine";

export interface SEOSnapshot {
  dominant_topics: string[];
  funnel_strategy: string;
  content_intensity: string;
  enterprise_signal: string;
  seo_risk_flags: string[];
  trajectory_signal: string;
  executive_summary: string;
}

export interface SeoIntelligenceResult {
  snapshot: SEOSnapshot;
  topicClusters: TopicCluster[];
  funnel: FunnelDistribution;
  content: ContentDepthMetrics;
  dimensions: SEODimensions;
  evolution: SeoEvolutionResult;
  domainKeywordProfile: DomainKeywordProfile[];
  dominantKeywords: string[];
  weightedClusters: TopicClusterScore[];
  contentGap: ContentGapResult;
}

function hashIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  const n = parseInt(hex, 16);
  return n % modulo;
}

function level(score: number): "Low" | "Moderate" | "High" {
  if (score >= 75) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

function describeFunnel(funnel: FunnelDistribution): string {
  const total =
    funnel.top_of_funnel + funnel.mid_of_funnel + funnel.bottom_of_funnel;
  if (total === 0) return "Funnel coverage not yet observable from captured content.";

  const share = (value: number) => value / total;
  const label = (s: number): "Limited" | "Moderate" | "Strong" => {
    if (s >= 0.45) return "Strong";
    if (s >= 0.2) return "Moderate";
    return "Limited";
  };

  const topLabel = label(share(funnel.top_of_funnel));
  const midLabel = label(share(funnel.mid_of_funnel));
  const bottomLabel = label(share(funnel.bottom_of_funnel));

  return `Top-of-Funnel: ${topLabel} · Mid-Funnel: ${midLabel} · Bottom-of-Funnel: ${bottomLabel}`;
}

function describeContentIntensity(content: ContentDepthMetrics): string {
  if (content.total_blog_pages === 0) {
    return "Limited visible content investment captured so far.";
  }

  const levelLabel = level(content.content_investment_score);
  const avgWords =
    content.avg_word_count > 0 ? `${content.avg_word_count.toLocaleString()} words` : "n/a";
  const freq =
    content.publishing_frequency_per_month > 0
      ? `${content.publishing_frequency_per_month}/month`
      : "low / irregular cadence";

  return `Blog Pages: ${content.total_blog_pages} · Avg Depth: ${avgWords} · Publishing Frequency: ${freq} (${levelLabel} investment).`;
}

function buildEnterpriseSignal(dimensions: SEODimensions): string {
  const levelLabel = level(dimensions.enterprise_seo_orientation);
  if (dimensions.enterprise_seo_orientation === 0) {
    return "No strong enterprise-specific SEO emphasis detected yet.";
  }
  return `Enterprise Orientation: ${levelLabel} emphasis in SEO content.`;
}

function detectSeoRiskFlags(dimensions: SEODimensions): string[] {
  const flags: string[] = [];

  if (dimensions.topic_concentration > 80 && dimensions.vertical_seo_focus < 30) {
    flags.push("Narrow topic diversity with limited vertical depth.");
  }
  if (dimensions.funnel_coverage_balance < 40) {
    flags.push("Imbalanced funnel coverage across awareness, consideration, and decision content.");
  }
  if (dimensions.content_investment_intensity < 30) {
    flags.push("Low visible content investment relative to typical enterprise programs.");
  }
  if (dimensions.seo_momentum < 30 && dimensions.content_investment_intensity > 40) {
    flags.push("Content library exists but recent publishing momentum appears muted.");
  }

  return flags.slice(0, 3);
}

function buildTrajectoryLabel(evolution: SeoEvolutionResult): string {
  if (evolution.acceleration_level === "Stable") return "Stable";
  if (evolution.acceleration_level === "Increasing") return "Expanding";
  return "Aggressive Expansion";
}

function buildExecutiveSummary(
  competitorId: string,
  clusters: TopicCluster[],
  dimensions: SEODimensions,
  evolution: SeoEvolutionResult
): string {
  const dominantTopics =
    clusters.length > 0 ? clusters.slice(0, 2).map((c) => c.cluster_name).join(" and ") : "general topics";

  const templates: string[] = [
    `This competitor concentrates SEO efforts on ${dominantTopics.toLowerCase()} themes. Content investment appears ${level(
      dimensions.content_investment_intensity
    ).toLowerCase()} with ${level(dimensions.funnel_coverage_balance).toLowerCase()} funnel coverage. ${evolution.expansion_signal}`,
    `Observed SEO activity skews toward ${dominantTopics.toLowerCase()} while maintaining ${level(
      dimensions.funnel_coverage_balance
    ).toLowerCase()} coverage across the funnel. Overall content investment is ${level(
      dimensions.content_investment_intensity
    ).toLowerCase()}, with trajectory classified as ${evolution.acceleration_level.toLowerCase()}.`,
    `Current search positioning is anchored in ${dominantTopics.toLowerCase()} topics with ${
      level(dimensions.content_investment_intensity).toLowerCase()
    } content depth. Funnel mix is ${level(
      dimensions.funnel_coverage_balance
    ).toLowerCase()}, and recent signals point to ${buildTrajectoryLabel(
      evolution
    ).toLowerCase()} rather than abrupt shifts.`,
  ];

  const idx = hashIndex(`${competitorId}:seo_snapshot`, templates.length);
  return templates[idx];
}

export function buildSeoIntelligence(params: {
  competitorId: string;
  pages: SEOPageData[];
  targetPages?: SEOPageData[];
  previousSnapshots?: SEOSnapshotRecord[];
}): SeoIntelligenceResult {
  const { competitorId, pages, targetPages, previousSnapshots } = params;

  const filteredPages = pages.filter((p) => p.url);
  const keywords = buildKeywordProfile(filteredPages);
  const topicClusters = buildTopicClusters(keywords);
  const funnel = computeFunnelDistribution(filteredPages);
  const content = computeContentDepthMetrics(filteredPages);
  const dimensions = computeSeoDimensions({
    clusters: topicClusters,
    funnel,
    content,
    pages: filteredPages,
  });
  const evolution = previousSnapshots && previousSnapshots.length > 0
    ? analyzeSeoEvolution(previousSnapshots)
    : analyzeSeoEvolution([]);

  const domainKeywordProfile = extractDomainKeywordProfile({
    domainId: competitorId,
    pages: filteredPages,
  });
  const dominantKeywords = domainKeywordProfile
    .slice(0, 30)
    .map((k) => k.keyword);

  const weightedClusters = mapKeywordClusters(domainKeywordProfile);

  const referenceProfile = extractDomainKeywordProfile({
    domainId: `${competitorId}:reference`,
    pages: targetPages ?? [],
  });
  const referenceClusters = mapKeywordClusters(referenceProfile);
  const contentGap = findContentGaps({
    targetDomainProfile: domainKeywordProfile,
    competitorProfile: referenceProfile,
    targetClusters: weightedClusters,
    competitorClusters: referenceClusters,
  });

  const dominant_topics =
    weightedClusters.length > 0
      ? weightedClusters.slice(0, 5).map((c) => c.cluster_name)
      : topicClusters.slice(0, 5).map((c) => c.cluster_name);
  const funnel_strategy = describeFunnel(funnel);
  const content_intensity = describeContentIntensity(content);
  const enterprise_signal = buildEnterpriseSignal(dimensions);
  const seo_risk_flags = detectSeoRiskFlags(dimensions);
  const trajectory_signal = buildTrajectoryLabel(evolution);
  const executive_summary = buildExecutiveSummary(
    competitorId,
    topicClusters,
    dimensions,
    evolution
  );

  return {
    snapshot: {
      dominant_topics,
      funnel_strategy,
      content_intensity,
      enterprise_signal,
      seo_risk_flags,
      trajectory_signal,
      executive_summary,
    },
    topicClusters,
    funnel,
    content,
    dimensions,
    evolution,
    domainKeywordProfile,
    dominantKeywords,
    weightedClusters,
    contentGap,
  };
}

