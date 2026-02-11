import type { SEODimensions } from "./seoScoringEngine";

export interface CompetitorSeoSummary {
  competitorId: string;
  dimensions: SEODimensions;
}

export interface SEOComparisonResult {
  relative_topic_advantage: string;
  funnel_dominance: string;
  content_investment_leader: string;
}

export function compareSeoAcrossCompetitors(
  competitors: CompetitorSeoSummary[]
): SEOComparisonResult {
  if (!competitors || competitors.length === 0) {
    return {
      relative_topic_advantage: "No comparison data available.",
      funnel_dominance: "No comparison data available.",
      content_investment_leader: "No comparison data available.",
    };
  }

  const topicLeader = [...competitors].sort(
    (a, b) => b.dimensions.topic_concentration - a.dimensions.topic_concentration
  )[0];

  const funnelLeader = [...competitors].sort(
    (a, b) => b.dimensions.funnel_coverage_balance - a.dimensions.funnel_coverage_balance
  )[0];

  const contentLeader = [...competitors].sort(
    (a, b) => b.dimensions.content_investment_intensity - a.dimensions.content_investment_intensity
  )[0];

  return {
    relative_topic_advantage: topicLeader
      ? `Strongest topic concentration signal among tracked peers: ${topicLeader.competitorId}.`
      : "No clear topic concentration leader among tracked peers.",
    funnel_dominance: funnelLeader
      ? `Best-balanced funnel coverage among tracked peers: ${funnelLeader.competitorId}.`
      : "No clear funnel coverage leader among tracked peers.",
    content_investment_leader: contentLeader
      ? `Highest content investment intensity among tracked peers: ${contentLeader.competitorId}.`
      : "No clear content investment leader among tracked peers.",
  };
}

