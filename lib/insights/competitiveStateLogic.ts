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
export type SignalConfidence = "High" | "Medium" | "Low";

export type KeySignal = {
  label: string;
  value: string;
  confidence: SignalConfidence;
};

export type ServiceSnapshot = {
  strategic_keywords_count: number;
  execution_keywords_count: number;
  lifecycle_keywords_count: number;
  enterprise_keywords_count: number;
  industries: string[];
  primary_focus: "Strategic" | "Execution" | "Balanced";
  section_count: number;
};

function confidenceFromDataDensity(signalCount: number): SignalConfidence {
  if (signalCount >= 3) return "High";
  if (signalCount >= 1) return "Medium";
  return "Low";
}

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

export function deriveKeySignals(params: {
  status: CompetitiveStatus;
  insightsLast30d: InsightLike[];
}): {
  positioning: KeySignal;
  gtmMotion: KeySignal;
  pricingPosture: KeySignal;
} {
  const insightTexts = params.insightsLast30d.map((insight) => insight.insight_text.toLowerCase());
  const joined = insightTexts.join(" ");

  const positioning: KeySignal = {
    label: "Positioning",
    value:
      params.status === "Active"
        ? "Active repositioning"
        : params.status === "Moderate"
        ? "Selective positioning updates"
        : "Stable positioning",
    confidence: confidenceFromDataDensity(params.insightsLast30d.length),
  };

  const salesKeywords = [
    "book demo",
    "request demo",
    "contact sales",
    "talk to sales",
    "sales-led",
    "sales-assisted",
  ];
  const selfServeKeywords = [
    "start trial",
    "free trial",
    "get started",
    "sign up",
    "self-serve",
  ];
  const hasSales = salesKeywords.some((k) => joined.includes(k));
  const hasSelfServe = selfServeKeywords.some((k) => joined.includes(k));

  const gtmMotion: KeySignal = {
    label: "GTM Motion",
    value: hasSales && hasSelfServe ? "Hybrid motion" : hasSales ? "Sales-assisted motion" : hasSelfServe ? "Self-serve motion" : "Motion not yet conclusive",
    confidence: confidenceFromDataDensity(Number(hasSales) + Number(hasSelfServe)),
  };

  const enterpriseKeywords = [
    "contact us",
    "custom",
    "enterprise",
    "sales-driven",
    "enterprise positioning emphasized",
  ];
  const growthKeywords = ["$", "free", "trial", "growth-led", "starter", "monthly", "annual"];
  const enterpriseHits = enterpriseKeywords.filter((k) => joined.includes(k)).length;
  const growthHits = growthKeywords.filter((k) => joined.includes(k)).length;

  const pricingPosture: KeySignal = {
    label: "Pricing Posture",
    value:
      enterpriseHits > growthHits
        ? "Enterprise-led pricing"
        : growthHits > enterpriseHits
        ? "Growth-led pricing"
        : "Balanced or unchanged pricing posture",
    confidence: confidenceFromDataDensity(Math.max(enterpriseHits, growthHits)),
  };

  return { positioning, gtmMotion, pricingPosture };
}

export function deriveStrategicImplications(params: {
  keySignals: {
    positioning: KeySignal;
    gtmMotion: KeySignal;
    pricingPosture: KeySignal;
  };
  insightsLast30d: InsightLike[];
}): Array<{ text: string; confidence: SignalConfidence }> {
  const { keySignals, insightsLast30d } = params;
  const sharedConfidence = confidenceFromDataDensity(insightsLast30d.length);
  const bullets: Array<{ text: string; confidence: SignalConfidence }> = [];

  if (keySignals.positioning.value.toLowerCase().includes("stable")) {
    bullets.push({
      text: "Positioning remains steady, indicating continuity in market narrative.",
      confidence: keySignals.positioning.confidence,
    });
  } else {
    bullets.push({
      text: "Positioning shifts suggest active refinement of external market messaging.",
      confidence: keySignals.positioning.confidence,
    });
  }

  if (keySignals.gtmMotion.value.toLowerCase().includes("sales-assisted")) {
    bullets.push({
      text: "Go-to-market execution appears oriented toward higher-touch sales engagement.",
      confidence: keySignals.gtmMotion.confidence,
    });
  } else if (keySignals.gtmMotion.value.toLowerCase().includes("self-serve")) {
    bullets.push({
      text: "Go-to-market execution appears optimized for lower-friction self-serve adoption.",
      confidence: keySignals.gtmMotion.confidence,
    });
  } else if (keySignals.gtmMotion.value.toLowerCase().includes("hybrid")) {
    bullets.push({
      text: "Go-to-market execution appears balanced between product-led and sales-assisted routes.",
      confidence: keySignals.gtmMotion.confidence,
    });
  }

  if (keySignals.pricingPosture.value.toLowerCase().includes("enterprise-led")) {
    bullets.push({
      text: "Pricing language suggests emphasis on enterprise packaging and negotiated monetization.",
      confidence: keySignals.pricingPosture.confidence,
    });
  } else if (keySignals.pricingPosture.value.toLowerCase().includes("growth-led")) {
    bullets.push({
      text: "Pricing language suggests emphasis on scalable acquisition through accessible entry points.",
      confidence: keySignals.pricingPosture.confidence,
    });
  } else {
    bullets.push({
      text: "Pricing posture appears balanced, with no dominant directional shift currently visible.",
      confidence: keySignals.pricingPosture.confidence,
    });
  }

  bullets.push({
    text: "Current signal density supports directional interpretation while warranting continued monitoring.",
    confidence: sharedConfidence,
  });

  return bullets.slice(0, 4);
}

export function deriveWhatToWatchNext(params: {
  status: CompetitiveStatus;
  keySignals: {
    gtmMotion: KeySignal;
    pricingPosture: KeySignal;
  };
}): string[] {
  const items: string[] = [];

  if (params.status === "Stable") {
    items.push("Monitor homepage and core value proposition for the next non-routine update.");
    items.push("Track any first movement in pricing or packaging language for directional change.");
  } else if (params.status === "Moderate") {
    items.push("Track whether current selective updates expand into broader site-wide repositioning.");
    items.push("Monitor CTA consistency to confirm whether GTM motion is stabilizing or diverging.");
  } else {
    items.push("Track whether elevated update velocity persists across the next monitoring cycle.");
    items.push("Monitor for convergence between messaging updates and pricing narrative shifts.");
  }

  if (params.keySignals.gtmMotion.value.toLowerCase().includes("sales-assisted")) {
    items.push("Watch for stronger enterprise proof points supporting higher-touch conversion paths.");
  } else if (params.keySignals.gtmMotion.value.toLowerCase().includes("self-serve")) {
    items.push("Watch for simplification in onboarding and plan language reinforcing self-serve growth.");
  }

  if (params.keySignals.pricingPosture.value.toLowerCase().includes("enterprise-led")) {
    items.push("Watch for expanded custom-plan cues and procurement-oriented messaging.");
  } else if (params.keySignals.pricingPosture.value.toLowerCase().includes("growth-led")) {
    items.push("Watch for expanded free-trial or entry-tier cues in pricing pages.");
  }

  return Array.from(new Set(items)).slice(0, 4);
}

export function deriveServiceInsights(snapshot: ServiceSnapshot | null): string[] {
  if (!snapshot) {
    return ["Service intelligence will populate once a services or solutions page is captured."];
  }

  const insights: string[] = [];
  const industries = Array.isArray(snapshot.industries) ? snapshot.industries : [];

  // Rule 1: Strategic-heavy language
  if (snapshot.strategic_keywords_count >= snapshot.execution_keywords_count + 2) {
    insights.push("Service language emphasizes strategic transformation positioning.");
  }

  // Rule 2: Execution-heavy language
  if (snapshot.execution_keywords_count >= snapshot.strategic_keywords_count + 2) {
    insights.push("Service language emphasizes execution-oriented delivery capabilities.");
  }

  // Rule 3: Lifecycle capability
  if (snapshot.lifecycle_keywords_count >= 2) {
    insights.push("Lifecycle-oriented delivery model is visible across service narratives.");
  }

  // Rule 4: Enterprise orientation
  if (snapshot.enterprise_keywords_count >= 2) {
    insights.push("Enterprise-oriented service posture is consistently signaled.");
  }

  // Rule 5: Breadth of services
  if (snapshot.section_count > 6) {
    insights.push("Broad multi-service capability footprint is presented.");
  }

  if (industries.length >= 2) {
    insights.push(
      `Vertical focus is visible across ${industries.slice(0, 3).join(", ")}.`
    );
  }

  if (insights.length === 0) {
    insights.push("Current service presentation appears balanced without a dominant positioning bias.");
  }

  return insights.slice(0, 5);
}

export function deriveStrategicConsiderations(snapshot: ServiceSnapshot | null): string[] {
  if (!snapshot) {
    return [
      "Monitor the first captured services page to establish baseline positioning and capability depth.",
      "Consider service breadth signals once section-level structure becomes available.",
    ];
  }

  const statements: string[] = [];
  const industries = Array.isArray(snapshot.industries) ? snapshot.industries : [];

  if (snapshot.primary_focus === "Strategic") {
    statements.push("Consider how strategic-led messaging may influence executive-level buying conversations.");
    statements.push("Monitor whether execution proof points catch up with strategy narrative depth.");
  } else if (snapshot.primary_focus === "Execution") {
    statements.push("Evaluate whether delivery-led positioning creates a speed or reliability differentiation.");
    statements.push("Monitor for additions in advisory or transformation language over time.");
  } else {
    statements.push("Consider the current balanced positioning as an attempt to cover both advisory and delivery demand.");
  }

  if (industries.length > 0) {
    statements.push(
      `Monitor vertical signal expansion beyond ${industries.slice(0, 2).join(" and ")}.`
    );
  }

  if (snapshot.section_count > 6) {
    statements.push("Evaluate whether broad service breadth converts into clear specialization narratives.");
  }

  return Array.from(new Set(statements)).slice(0, 4);
}
