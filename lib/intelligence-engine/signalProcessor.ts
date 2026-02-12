import type { PageType } from "@/lib/PAGE_TAXONOMY";

export type ServiceSnapshotSignal = {
  strategic_keywords_count: number;
  execution_keywords_count: number;
  lifecycle_keywords_count: number;
  enterprise_keywords_count: number;
  industries: string[];
  primary_focus: "Strategic" | "Execution" | "Balanced";
  section_count: number;
};

export type SnapshotSignal = {
  url?: string;
  http_status?: number | null;
  title?: string | null;
  page_title?: string | null;
  h1_text?: string | null;
  h2_headings?: string[] | null;
  h3_headings?: string[] | null;
  list_items?: string[] | null;
  nav_labels?: string[] | null;
  structured_content?: unknown;
};

export type WebpageSignalInsight = {
  page_type: PageType;
  insight_type: "webpage_signal";
  insight_text: string;
  created_at?: string;
};

export type RawSignals = {
  competitorId: string;
  trackedPageTypes: PageType[];
  changesLast30dCount: number;

  /** Latest snapshots per type (best-effort). */
  snapshots: Partial<Record<PageType, SnapshotSignal>>;

  /** Optional structured service snapshot (from `snapshots.structured_content`). */
  services?: {
    snapshot: ServiceSnapshotSignal | null;
    evidenceHeadings: string[];
    blockedByBotMitigation: boolean;
  };

  webpageSignals: {
    messagingTheme: string | null;
    gtmMotion: string | null;
    pricingNarrative: string | null;
    capabilityTheme: string | null;
  };
};

export type RawSignalsInput = {
  competitorId: string;
  trackedPageTypes: PageType[];
  changesLast30dCount: number;
  latestByPageType: Partial<Record<PageType, SnapshotSignal>>;
  webpageSignalInsights?: WebpageSignalInsight[];
};

function isCloudflareChallenge(snapshot: SnapshotSignal | undefined): boolean {
  if (!snapshot) return false;
  const status = snapshot.http_status ?? null;
  const title = (snapshot.title ?? "").toLowerCase();
  return (status === 401 || status === 403) && title.includes("just a moment");
}

function pickFirstMatching(texts: string[], needle: RegExp): string | null {
  for (const t of texts) {
    const m = t.match(needle);
    if (m) return m[1] ?? m[0] ?? null;
  }
  return null;
}

export function buildRawSignals(input: RawSignalsInput): RawSignals {
  const webpageSignalTexts = (input.webpageSignalInsights ?? []).map((i) => i.insight_text);
  const messagingTheme =
    pickFirstMatching(webpageSignalTexts, /homepage messaging emphasizes\s+([a-z- ]+)\./i) ?? null;
  const gtmMotion =
    pickFirstMatching(webpageSignalTexts, /primary cta suggests\s+(a .*?)\s+go-to-market strategy\./i) ??
    null;
  const pricingNarrative = pickFirstMatching(webpageSignalTexts, /(Enterprise positioning emphasized\.)/i) ??
    pickFirstMatching(webpageSignalTexts, /(Sales-driven monetization.*?\.)/i) ??
    pickFirstMatching(webpageSignalTexts, /(Growth-led pricing motion.*?\.)/i) ??
    null;
  const capabilityTheme =
    pickFirstMatching(webpageSignalTexts, /product capabilities emphasize\s+([a-z- ]+)\./i) ?? null;

  const servicesSnapshot = input.latestByPageType["services"] ?? undefined;
  const structured = (servicesSnapshot?.structured_content ?? null) as ServiceSnapshotSignal | null;
  const blockedByBotMitigation = isCloudflareChallenge(servicesSnapshot);
  const evidenceHeadings =
    (servicesSnapshot?.h2_headings ?? []).filter(Boolean).slice(0, 12) ?? [];

  return {
    competitorId: input.competitorId,
    trackedPageTypes: input.trackedPageTypes,
    changesLast30dCount: input.changesLast30dCount,
    snapshots: input.latestByPageType,
    services: {
      snapshot: structured,
      evidenceHeadings,
      blockedByBotMitigation,
    },
    webpageSignals: {
      messagingTheme,
      gtmMotion,
      pricingNarrative,
      capabilityTheme,
    },
  };
}

