import type { TopicCluster } from "./topicClusterEngine";
import type { FunnelDistribution } from "./funnelClassifier";
import type { ContentDepthMetrics } from "./contentDepthModel";
import type { SEOPageData } from "./contentCrawler";

export interface SEODimensions {
  topic_concentration: number;
  vertical_seo_focus: number;
  funnel_coverage_balance: number;
  content_investment_intensity: number;
  enterprise_seo_orientation: number;
  seo_momentum: number;
}

export function computeSeoDimensions(params: {
  clusters: TopicCluster[];
  funnel: FunnelDistribution;
  content: ContentDepthMetrics;
  pages: SEOPageData[];
}): SEODimensions {
  const { clusters, funnel, content, pages } = params;

  // Topic concentration: dominance of top cluster.
  const totalClusterWeight = clusters.reduce((sum, c) => sum + c.cluster_weight, 0);
  const topCluster = clusters[0];
  let topic_concentration = 0;
  if (topCluster && totalClusterWeight > 0) {
    const share = topCluster.cluster_weight / totalClusterWeight;
    topic_concentration = Math.round(share * 100);
  }

  // Vertical SEO focus: presence of industry clusters like FINTECH, etc.
  const verticalClusters = clusters.filter((c) =>
    ["FINTECH"].includes(c.cluster_name)
  );
  let vertical_seo_focus = 0;
  if (verticalClusters.length > 0) {
    const verticalWeight = verticalClusters.reduce((s, c) => s + c.cluster_weight, 0);
    vertical_seo_focus = Math.round(
      Math.min(1, verticalWeight / Math.max(1, totalClusterWeight)) * 100
    );
  }

  // Funnel coverage balance: closeness to equal distribution across TOFU/MOFU/BOFU.
  const totalFunnel =
    funnel.top_of_funnel + funnel.mid_of_funnel + funnel.bottom_of_funnel;
  let funnel_coverage_balance = 0;
  if (totalFunnel > 0) {
    const ideal = totalFunnel / 3;
    const diffs = [
      Math.abs(funnel.top_of_funnel - ideal),
      Math.abs(funnel.mid_of_funnel - ideal),
      Math.abs(funnel.bottom_of_funnel - ideal),
    ];
    const maxDiff = Math.max(...diffs);
    const balance = 1 - maxDiff / totalFunnel;
    funnel_coverage_balance = Math.round(balance * 100);
  }

  // Content investment intensity: reuse content_investment_score.
  const content_investment_intensity = content.content_investment_score;

  // Enterprise SEO orientation: detect enterprise language in titles/H1.
  const text = pages
    .map((p) => `${p.h1} ${p.meta_title}`)
    .join(" ")
    .toLowerCase();
  const enterpriseHits =
    (text.match(/enterprise/g) || []).length +
    (text.match(/cxo|c-suite|cio|cto|cfo/g) || []).length;
  let enterprise_seo_orientation = 0;
  if (enterpriseHits > 0) {
    enterprise_seo_orientation = Math.min(100, 40 + enterpriseHits * 10);
  }

  // SEO momentum: based on publishing cadence and recency.
  let seo_momentum = 0;
  const now = Date.now();
  const recentThresholdMs = 90 * 24 * 60 * 60 * 1000; // 90 days
  const recentPosts = pages.filter(
    (p) => p.published_at && now - p.published_at.getTime() <= recentThresholdMs
  );
  if (recentPosts.length > 0) {
    // Blend cadence and recency.
    const cadenceFactor = Math.min(content.publishing_frequency_per_month / 6, 1); // 6+/month -> 1
    const recencyFactor = Math.min(recentPosts.length / Math.max(1, pages.length), 1);
    seo_momentum = Math.round((0.6 * cadenceFactor + 0.4 * recencyFactor) * 100);
  }

  return {
    topic_concentration,
    vertical_seo_focus,
    funnel_coverage_balance,
    content_investment_intensity,
    enterprise_seo_orientation,
    seo_momentum,
  };
}

