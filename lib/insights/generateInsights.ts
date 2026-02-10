import type { PageType } from "@/lib/PAGE_TAXONOMY";
import type { PmSignalDiff } from "@/lib/change-detection/detectPmSignalChanges";

export type InsightType =
  | "messaging_shift"
  | "conversion_strategy"
  | "pricing_strategy"
  | "product_focus"
  | "credibility_proof"
  | "strategic_priority";

export interface GeneratedInsight {
  competitor_id: string;
  page_type: PageType;
  insight_type: InsightType;
  insight_text: string;
  confidence: "High" | "Medium";
  related_change_ids: string[];
  created_at?: string;
}

function mapDiffToInsight(diff: PmSignalDiff): Pick<GeneratedInsight, "insight_type" | "insight_text" | "confidence"> {
  if (diff.change_type === "homepage_headline_change") {
    return {
      insight_type: "messaging_shift",
      insight_text: "Competitor updated core positioning or messaging.",
      confidence: "High",
    };
  }
  if (diff.change_type === "cta_text_change") {
    return {
      insight_type: "conversion_strategy",
      insight_text: "Go-to-market or conversion strategy updated.",
      confidence: "High",
    };
  }
  if (diff.change_type === "pricing_structure_change") {
    return {
      insight_type: "pricing_strategy",
      insight_text: "Pricing or packaging strategy updated.",
      confidence: "High",
    };
  }
  if (diff.change_type === "product_service_section_change") {
    return {
      insight_type: "product_focus",
      insight_text: "Service or product focus evolving.",
      confidence: "Medium",
    };
  }
  if (diff.change_type === "case_study_or_customer_logo_added") {
    return {
      insight_type: "credibility_proof",
      insight_text: "Credibility strengthened with new proof.",
      confidence: "High",
    };
  }
  return {
    insight_type: "strategic_priority",
    insight_text: "Strategic focus area shifted.",
    confidence: "High",
  };
}

export function generateInsights(params: {
  competitorId: string;
  pageType: PageType;
  diffs: PmSignalDiff[];
  relatedChangeIds: string[];
}): GeneratedInsight[] {
  const dedupedByType = new Map<InsightType, GeneratedInsight>();

  for (const diff of params.diffs) {
    const mapped = mapDiffToInsight(diff);
    if (!dedupedByType.has(mapped.insight_type)) {
      dedupedByType.set(mapped.insight_type, {
        competitor_id: params.competitorId,
        page_type: params.pageType,
        insight_type: mapped.insight_type,
        insight_text: mapped.insight_text,
        confidence: mapped.confidence,
        related_change_ids: params.relatedChangeIds,
      });
    }
  }

  return [...dedupedByType.values()];
}
