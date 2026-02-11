import type { PageType } from "@/lib/PAGE_TAXONOMY";
import type { RawSignals } from "./signalProcessor";

export type EvidenceItem = {
  source: "snapshot" | "webpage_signal" | "coverage" | "activity";
  key: string;
  value: unknown;
};

export type Trait<TValue extends string = string> = {
  id: string;
  label: string;
  value: TValue;
  ruleId: string;
  evidence: EvidenceItem[];
};

export type CompetitiveTraits = {
  service_breadth: Trait<"broad" | "focused" | "unknown">;
  service_focus: Trait<"Strategic" | "Execution" | "Balanced" | "unknown">;
  vertical_focus: Trait<"clear" | "diffuse" | "unknown">;
  monetization_signal: Trait<"enterprise" | "sales-led" | "growth-led" | "unknown">;
  gtm_motion: Trait<"sales-led" | "self-serve" | "hybrid" | "unknown">;
  messaging_emphasis: Trait<string>;
  credibility_surface: Trait<"present" | "absent" | "unknown">;
  execution_velocity: Trait<"active" | "selective" | "stable">;
  bot_mitigation_block: Trait<"blocked" | "not_blocked">;
};

function hasType(tracked: PageType[], t: PageType): boolean {
  return tracked.includes(t);
}

function deriveExecutionVelocity(changesLast30dCount: number): "active" | "selective" | "stable" {
  if (changesLast30dCount >= 5) return "active";
  if (changesLast30dCount >= 2) return "selective";
  return "stable";
}

export function deriveCompetitiveTraits(signals: RawSignals): CompetitiveTraits {
  const serviceSectionCount = signals.services?.snapshot?.section_count ?? null;
  const serviceBreadth: CompetitiveTraits["service_breadth"]["value"] =
    serviceSectionCount == null
      ? "unknown"
      : serviceSectionCount > 6
      ? "broad"
      : serviceSectionCount > 0
      ? "focused"
      : "unknown";

  const serviceFocus: CompetitiveTraits["service_focus"]["value"] =
    signals.services?.snapshot?.primary_focus ?? "unknown";

  const industries = signals.services?.snapshot?.industries ?? [];
  const verticalFocus: CompetitiveTraits["vertical_focus"]["value"] =
    industries.length >= 2 ? "clear" : industries.length === 1 ? "diffuse" : "unknown";

  const pricingNarr = (signals.webpageSignals.pricingNarrative ?? "").toLowerCase();
  const monetizationSignal: CompetitiveTraits["monetization_signal"]["value"] =
    pricingNarr.includes("enterprise positioning emphasized") ? "enterprise" : pricingNarr.includes("sales-driven") ? "sales-led" : pricingNarr.includes("growth-led") ? "growth-led" : "unknown";

  const gtmRaw = (signals.webpageSignals.gtmMotion ?? "").toLowerCase();
  const gtmMotion: CompetitiveTraits["gtm_motion"]["value"] =
    gtmRaw.includes("hybrid") ? "hybrid" : gtmRaw.includes("sales-led") ? "sales-led" : gtmRaw.includes("self-serve") ? "self-serve" : "unknown";

  const messaging = signals.webpageSignals.messagingTheme ?? "unknown";

  const credibilitySurface: CompetitiveTraits["credibility_surface"]["value"] =
    hasType(signals.trackedPageTypes, "case_studies_or_customers") ? "present" : "absent";

  const executionVelocity = deriveExecutionVelocity(signals.changesLast30dCount);

  const blocked = signals.services?.blockedByBotMitigation ? "blocked" : "not_blocked";

  return {
    service_breadth: {
      id: "service_breadth",
      label: "Service breadth",
      value: serviceBreadth,
      ruleId: "TE-SVC-001",
      evidence: [
        { source: "snapshot", key: "services.section_count", value: serviceSectionCount },
      ],
    },
    service_focus: {
      id: "service_focus",
      label: "Service focus",
      value: serviceFocus,
      ruleId: "TE-SVC-002",
      evidence: [
        { source: "snapshot", key: "services.primary_focus", value: serviceFocus },
      ],
    },
    vertical_focus: {
      id: "vertical_focus",
      label: "Vertical focus",
      value: verticalFocus,
      ruleId: "TE-VERT-001",
      evidence: [{ source: "snapshot", key: "services.industries", value: industries }],
    },
    monetization_signal: {
      id: "monetization_signal",
      label: "Monetization signal",
      value: monetizationSignal,
      ruleId: "TE-PRICE-001",
      evidence: [
        { source: "webpage_signal", key: "pricingNarrative", value: signals.webpageSignals.pricingNarrative },
      ],
    },
    gtm_motion: {
      id: "gtm_motion",
      label: "GTM motion",
      value: gtmMotion,
      ruleId: "TE-GTM-001",
      evidence: [{ source: "webpage_signal", key: "gtmMotion", value: signals.webpageSignals.gtmMotion }],
    },
    messaging_emphasis: {
      id: "messaging_emphasis",
      label: "Messaging emphasis",
      value: messaging,
      ruleId: "TE-MSG-001",
      evidence: [{ source: "webpage_signal", key: "messagingTheme", value: signals.webpageSignals.messagingTheme }],
    },
    credibility_surface: {
      id: "credibility_surface",
      label: "Credibility surface",
      value: credibilitySurface,
      ruleId: "TE-CRED-001",
      evidence: [{ source: "coverage", key: "tracked.case_studies_or_customers", value: hasType(signals.trackedPageTypes, "case_studies_or_customers") }],
    },
    execution_velocity: {
      id: "execution_velocity",
      label: "Execution velocity",
      value: executionVelocity,
      ruleId: "TE-ACT-001",
      evidence: [{ source: "activity", key: "changesLast30dCount", value: signals.changesLast30dCount }],
    },
    bot_mitigation_block: {
      id: "bot_mitigation_block",
      label: "Bot mitigation",
      value: blocked,
      ruleId: "TE-QUAL-001",
      evidence: [
        { source: "snapshot", key: "services.blockedByBotMitigation", value: signals.services?.blockedByBotMitigation ?? false },
      ],
    },
  };
}

