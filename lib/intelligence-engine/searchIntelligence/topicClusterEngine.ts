import type { KeywordProfile } from "./keywordExtractor";

export interface TopicCluster {
  cluster_name: string;
  cluster_weight: number;
}

const TOPIC_MAP: Record<string, string[]> = {
  CLOUD: ["cloud", "migration", "aws", "azure", "gcp", "kubernetes"],
  TRANSFORMATION: ["digital transformation", "modernization", "innovation", "change management"],
  FINTECH: ["banking", "payments", "fintech", "financial services"],
  SAAS: ["platform", "software", "saas", "subscription"],
  DATA_ANALYTICS: ["analytics", "bi", "data warehouse", "reporting"],
  SECURITY: ["security", "compliance", "risk", "identity"],
};

export function buildTopicClusters(keywords: KeywordProfile[]): TopicCluster[] {
  const weights: Record<string, number> = {};

  for (const [clusterName, terms] of Object.entries(TOPIC_MAP)) {
    let weight = 0;
    for (const term of terms) {
      const termLc = term.toLowerCase();
      for (const kw of keywords) {
        if (kw.keyword.includes(termLc)) {
          weight += kw.frequency;
        }
      }
    }
    if (weight > 0) {
      weights[clusterName] = weight;
    }
  }

  return Object.entries(weights)
    .map(([cluster_name, cluster_weight]) => ({ cluster_name, cluster_weight }))
    .sort((a, b) => b.cluster_weight - a.cluster_weight)
    .slice(0, 5);
}

