import { getPageTypeDefinition, PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";
import type { ObservationalInsight } from "./insightTypes";

type ObservationalInput = {
  pageTypes: PageType[];
  pageTypesWithInsights: PageType[];
  hasAnyInsights: boolean;
};

function isKnownPageType(pageType: string | null | undefined): pageType is PageType {
  if (!pageType) return false;
  return (Object.values(PAGE_TAXONOMY) as string[]).includes(pageType);
}

function pageTypeToObservation(pageType: PageType): string {
  switch (pageType) {
    case "homepage":
      return "Homepage under continuous tracking.";
    case "pricing":
      return "Pricing page detected; no changes observed.";
    case "services":
      return "Services and solutions pages detected and monitored.";
    case "product_or_services":
      return "Services page actively monitored.";
    case "use_cases_or_industries":
      return "Messaging-focused pages tracked and stable.";
    case "case_studies_or_customers":
      return "Case studies detected and monitored.";
    case "cta_elements":
      return "Conversion pages actively monitored.";
    case "navigation":
      return "Navigation structure tracked and stable.";
    default: {
      const definition = getPageTypeDefinition(pageType);
      if (!definition) {
        return "Pages are actively monitored; no changes detected.";
      }
      return `${definition.label} page actively monitored; no changes detected.`;
    }
  }
}

export function generateObservationalInsights({
  pageTypes,
  pageTypesWithInsights,
  hasAnyInsights,
}: ObservationalInput): ObservationalInsight[] {
  const uniquePageTypes = Array.from(
    new Set(pageTypes.filter((t) => isKnownPageType(t)) as PageType[])
  );
  const insightPageTypeSet = new Set(
    pageTypesWithInsights.filter((t) => isKnownPageType(t)) as PageType[]
  );

  const insights: ObservationalInsight[] = [];

  for (const pageType of uniquePageTypes) {
    if (!insightPageTypeSet.has(pageType)) {
      insights.push({
        state: "observational",
        type: "page_monitoring",
        text: pageTypeToObservation(pageType),
        confidence: "High",
      });
    }
  }

  if (!hasAnyInsights) {
    insights.unshift({
      state: "observational",
      type: "stability_indicator",
      text: "No strategic changes detected so far.",
      confidence: "High",
    });
  }

  if (insights.length === 0 && uniquePageTypes.length > 0) {
    insights.push({
      state: "observational",
      type: "coverage_status",
      text: "Pages are actively monitored; no changes detected.",
      confidence: "Medium",
    });
  }

  return insights;
}
