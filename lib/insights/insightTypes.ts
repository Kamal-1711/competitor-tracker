export type InsightState = "observational" | "change_based";

export type ObservationalInsightType =
  | "page_monitoring"
  | "coverage_status"
  | "stability_indicator";

export type ChangeBasedInsightType =
  | "messaging_shift"
  | "conversion_strategy"
  | "pricing_strategy"
  | "product_focus"
  | "credibility_proof"
  | "strategic_priority";

export type InsightConfidence = "High" | "Medium";

export type ObservationalInsight = {
  state: "observational";
  type: ObservationalInsightType;
  text: string;
  confidence: InsightConfidence;
};

export type ChangeBasedInsight = {
  state: "change_based";
  type: ChangeBasedInsightType;
  text: string;
  confidence: InsightConfidence;
};

export type Insight = ObservationalInsight | ChangeBasedInsight;
