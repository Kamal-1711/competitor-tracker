import { getPageTypeDefinition, PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";

export type InsightLike = {
  page_type: PageType;
  insight_type?: string;
  insight_text: string;
  created_at: string;
};

export type ChangeLike = {
  page_type: string;
  category?: string | null;
  created_at: string;
};

export type CompetitiveStatus = "Stable" | "Moderate" | "Active";
export type TrackingConfidence = "High" | "Medium";
export type CompetitivePosture = "Maintaining Position" | "Experimenting" | "Expanding";

function hasType(items: PageType[], target: PageType): boolean {
  return items.includes(target);
}

export function deriveCompetitiveState(params: {
  changesLast30dCount: number;
  trackedPageTypes: PageType[];
  insightsLast30d: InsightLike[];
  changesLast30d: ChangeLike[];
}): {
  status: CompetitiveStatus;
  trackingConfidence: TrackingConfidence;
  competitivePosture: CompetitivePosture;
  summary: string[];
} {
  const { changesLast30dCount, trackedPageTypes, insightsLast30d, changesLast30d } = params;

  const status: CompetitiveStatus =
    changesLast30dCount >= 5 ? "Active" : changesLast30dCount >= 2 ? "Moderate" : "Stable";
  const trackingConfidence: TrackingConfidence = trackedPageTypes.length >= 2 ? "High" : "Medium";

  const hasPricingChange = insightsLast30d.some(
    (insight) =>
      insight.page_type === PAGE_TAXONOMY.PRICING && insight.insight_type !== "observational"
  );
  const hasHomepageChange = insightsLast30d.some(
    (insight) =>
      insight.page_type === PAGE_TAXONOMY.HOMEPAGE && insight.insight_type !== "observational"
  );
  const hasNavigationChange = changesLast30d.some(
    (change) =>
      change.page_type === PAGE_TAXONOMY.NAVIGATION ||
      change.category === "Navigation / Structure"
  );

  let competitivePosture: CompetitivePosture = "Maintaining Position";
  if (changesLast30dCount === 0) {
    competitivePosture = "Maintaining Position";
  } else if (hasNavigationChange) {
    competitivePosture = "Expanding";
  } else if (hasPricingChange && hasHomepageChange) {
    competitivePosture = "Experimenting";
  }

  const coverageLine =
    trackedPageTypes.length > 0
      ? `Monitoring currently covers ${trackedPageTypes.length} strategic area${
          trackedPageTypes.length === 1 ? "" : "s"
        }.`
      : "Monitoring has started and will become more comprehensive as pages are detected.";

  const statusLine =
    status === "Active"
      ? "Recent activity indicates meaningful strategic movement over the last 30 days."
      : status === "Moderate"
      ? "Recent activity shows selective updates across monitored areas."
      : "Recent activity remains limited, indicating short-term strategic stability.";

  const postureLine =
    competitivePosture === "Experimenting"
      ? "Current signals suggest controlled experimentation in positioning and monetization."
      : competitivePosture === "Expanding"
      ? "Current signals suggest expansion in information architecture or strategic surface area."
      : "Current signals suggest the competitor is maintaining its current market position.";

  return {
    status,
    trackingConfidence,
    competitivePosture,
    summary: [statusLine, postureLine, coverageLine],
  };
}

export function deriveFocusSignals(params: {
  trackedPageTypes: PageType[];
  insightsLast30d: InsightLike[];
}): {
  primaryFocusAreas: string[];
  secondarySignals: string[];
  interpretation: string;
} {
  const { trackedPageTypes, insightsLast30d } = params;
  const trackedSet = new Set(trackedPageTypes);

  const pageCounts = new Map<PageType, number>();
  for (const insight of insightsLast30d) {
    if (insight.insight_type === "observational") continue;
    pageCounts.set(insight.page_type, (pageCounts.get(insight.page_type) ?? 0) + 1);
  }

  const ranked = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const primaryFocusAreas =
    ranked.length > 0
      ? ranked.map(([pageType]) => getPageTypeDefinition(pageType).label)
      : trackedPageTypes.length > 0
      ? trackedPageTypes.slice(0, 3).map((pageType) => getPageTypeDefinition(pageType).label)
      : ["No clear movement yet across monitored areas"];

  const hasPricingChange = (pageCounts.get(PAGE_TAXONOMY.PRICING) ?? 0) > 0;
  const hasHomepageChange = (pageCounts.get(PAGE_TAXONOMY.HOMEPAGE) ?? 0) > 0;
  const hasServicesChange =
    (pageCounts.get(PAGE_TAXONOMY.PRODUCT_OR_SERVICES) ?? 0) > 0 ||
    (pageCounts.get(PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES) ?? 0) > 0;

  const secondarySignals: string[] = [];
  if (trackedSet.has(PAGE_TAXONOMY.PRICING) && !hasPricingChange) {
    secondarySignals.push("No pricing experimentation detected");
  }
  if (trackedSet.has(PAGE_TAXONOMY.HOMEPAGE) && !hasHomepageChange) {
    secondarySignals.push("No homepage messaging shift detected");
  }
  if (
    (trackedSet.has(PAGE_TAXONOMY.PRODUCT_OR_SERVICES) ||
      trackedSet.has(PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES)) &&
    !hasServicesChange
  ) {
    secondarySignals.push("No services or use-case repositioning detected");
  }
  if (secondarySignals.length === 0) {
    secondarySignals.push("No inactivity flags across high-impact monitored areas");
  }

  let interpretation = "Competitor appears focused on reinforcing existing positioning.";
  if (!hasPricingChange && !hasHomepageChange) {
    interpretation = "Competitor appears focused on reinforcing existing positioning.";
  } else if (hasPricingChange && hasHomepageChange) {
    interpretation =
      "Competitor is actively tuning both market message and monetization surfaces.";
  } else if (hasServicesChange) {
    interpretation = "Competitor appears to be prioritizing offer clarity and solution framing.";
  }

  return {
    primaryFocusAreas,
    secondarySignals,
    interpretation,
  };
}

export function deriveStrategicWatchlist(params: {
  trackedPageTypes: PageType[];
}): Array<{ area: string; rationale: string }> {
  const uniqueTracked = Array.from(new Set(params.trackedPageTypes));
  const watchlist = uniqueTracked.map((pageType) => {
    const def = getPageTypeDefinition(pageType);
    return { area: def.label, rationale: def.pmValue };
  });

  return watchlist.length > 0
    ? watchlist
    : [
        {
          area: "Core strategic pages",
          rationale: "Monitoring is active and will flag high-impact strategic surfaces as discovered.",
        },
      ];
}

export function derivePmInterpretation(params: {
  status: CompetitiveStatus;
  trackedPageTypes: PageType[];
  insightsLast30d: InsightLike[];
}): string[] {
  const { status, trackedPageTypes, insightsLast30d } = params;
  const hasPricingMovement = insightsLast30d.some(
    (insight) =>
      insight.page_type === PAGE_TAXONOMY.PRICING && insight.insight_type !== "observational"
  );
  const hasMessagingMovement = insightsLast30d.some(
    (insight) =>
      insight.page_type === PAGE_TAXONOMY.HOMEPAGE && insight.insight_type !== "observational"
  );

  const bullet1 = hasPricingMovement
    ? "Pricing movement indicates active monetization refinement."
    : "No pricing movement suggests monetization strategy is currently unchanged.";

  const bullet2 = hasMessagingMovement
    ? "Messaging movement indicates active positioning adjustments."
    : "No messaging shift suggests the current positioning is likely performing.";

  const bullet3 =
    status === "Stable"
      ? "This stability period suggests focus may be on internal execution."
      : status === "Moderate"
      ? "Selective movement suggests focused updates rather than broad repositioning."
      : "Elevated movement suggests active iteration across multiple strategic surfaces.";

  const coverageNote =
    trackedPageTypes.length >= 2
      ? "Interpretation confidence is supported by multi-page monitoring coverage."
      : "Interpretation confidence will strengthen as monitoring coverage expands.";

  return [bullet1, bullet2, bullet3, coverageNote];
}
