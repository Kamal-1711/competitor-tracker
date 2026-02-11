import type { CompetitiveTraits } from "./traitEngine";

export type ScoreDimension =
  | "Positioning"
  | "OperationalDepth"
  | "MonetizationClarity"
  | "MarketFocus"
  | "CredibilityProof"
  | "ExecutionVelocity";

export type DimensionScore = {
  dimension: ScoreDimension;
  score: number; // 0..100
  ruleId: string;
  contributions: Array<{
    traitId: keyof CompetitiveTraits;
    weight: number;
    points: number;
    rationale: string;
  }>;
};

export type ScoreCard = Record<ScoreDimension, DimensionScore>;

const WEIGHTS = {
  Positioning: {
    messaging_emphasis: 0.45,
    service_focus: 0.35,
    capability_hint: 0.2,
  },
  OperationalDepth: {
    service_breadth: 0.65,
    service_focus: 0.35,
  },
  MonetizationClarity: {
    monetization_signal: 0.7,
    gtm_motion: 0.3,
  },
  MarketFocus: {
    vertical_focus: 0.7,
    service_breadth: 0.3,
  },
  CredibilityProof: {
    credibility_surface: 1.0,
  },
  ExecutionVelocity: {
    execution_velocity: 1.0,
  },
} as const;

function clampScore(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreTrait(traits: CompetitiveTraits, traitId: keyof CompetitiveTraits): number {
  const t = traits[traitId];
  switch (traitId) {
    case "service_breadth":
      return t.value === "broad" ? 85 : t.value === "focused" ? 55 : 40;
    case "service_focus":
      return t.value === "Strategic" ? 80 : t.value === "Balanced" ? 65 : t.value === "Execution" ? 55 : 40;
    case "vertical_focus":
      return t.value === "clear" ? 80 : t.value === "diffuse" ? 55 : 40;
    case "monetization_signal":
      return t.value === "enterprise" ? 75 : t.value === "sales-led" ? 65 : t.value === "growth-led" ? 60 : 40;
    case "gtm_motion":
      return t.value === "hybrid" ? 75 : t.value === "sales-led" ? 65 : t.value === "self-serve" ? 60 : 40;
    case "credibility_surface":
      return t.value === "present" ? 75 : t.value === "absent" ? 45 : 40;
    case "execution_velocity":
      return t.value === "active" ? 80 : t.value === "selective" ? 60 : 45;
    case "messaging_emphasis":
      return t.value !== "unknown" ? 70 : 45;
    case "bot_mitigation_block":
      // Quality signal, not directly scored in dimensions.
      return 0;
    default:
      return 0;
  }
}

function weightedSum(parts: Array<{ weight: number; value: number }>): number {
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return 0;
  const sum = parts.reduce((s, p) => s + p.weight * p.value, 0);
  return (sum / totalWeight) * (100 / 100);
}

export function computeScores(traits: CompetitiveTraits): ScoreCard {
  const positioningParts: Array<{ traitId: keyof CompetitiveTraits; weight: number; points: number; rationale: string }> = [
    {
      traitId: "messaging_emphasis",
      weight: WEIGHTS.Positioning.messaging_emphasis,
      points: scoreTrait(traits, "messaging_emphasis"),
      rationale: "Homepage messaging theme availability and clarity.",
    },
    {
      traitId: "service_focus",
      weight: WEIGHTS.Positioning.service_focus,
      points: scoreTrait(traits, "service_focus"),
      rationale: "Service framing (Strategic/Balanced/Execution) influences positioning depth.",
    },
    {
      traitId: "service_breadth",
      weight: WEIGHTS.Positioning.capability_hint,
      points: scoreTrait(traits, "service_breadth"),
      rationale: "Breadth can reinforce perceived capability scope.",
    },
  ];

  const operationalParts: Array<{ traitId: keyof CompetitiveTraits; weight: number; points: number; rationale: string }> = [
    {
      traitId: "service_breadth",
      weight: WEIGHTS.OperationalDepth.service_breadth,
      points: scoreTrait(traits, "service_breadth"),
      rationale: "More structured sections typically indicate broader operational surface area.",
    },
    {
      traitId: "service_focus",
      weight: WEIGHTS.OperationalDepth.service_focus,
      points: scoreTrait(traits, "service_focus"),
      rationale: "Execution-heavy focus can imply delivery depth; strategic can imply advisory depth.",
    },
  ];

  const monetizationParts: Array<{ traitId: keyof CompetitiveTraits; weight: number; points: number; rationale: string }> = [
    {
      traitId: "monetization_signal",
      weight: WEIGHTS.MonetizationClarity.monetization_signal,
      points: scoreTrait(traits, "monetization_signal"),
      rationale: "Pricing narrative signals are strong indicators of packaging intent.",
    },
    {
      traitId: "gtm_motion",
      weight: WEIGHTS.MonetizationClarity.gtm_motion,
      points: scoreTrait(traits, "gtm_motion"),
      rationale: "CTA-driven GTM motion clarifies conversion strategy.",
    },
  ];

  const marketFocusParts: Array<{ traitId: keyof CompetitiveTraits; weight: number; points: number; rationale: string }> = [
    {
      traitId: "vertical_focus",
      weight: WEIGHTS.MarketFocus.vertical_focus,
      points: scoreTrait(traits, "vertical_focus"),
      rationale: "Explicit industries indicate sharper market segmentation.",
    },
    {
      traitId: "service_breadth",
      weight: WEIGHTS.MarketFocus.service_breadth,
      points: scoreTrait(traits, "service_breadth"),
      rationale: "Breadth without vertical clarity may imply generalist positioning.",
    },
  ];

  const credibilityParts: Array<{ traitId: keyof CompetitiveTraits; weight: number; points: number; rationale: string }> = [
    {
      traitId: "credibility_surface",
      weight: WEIGHTS.CredibilityProof.credibility_surface,
      points: scoreTrait(traits, "credibility_surface"),
      rationale: "Presence of case studies/customers page implies proof surface.",
    },
  ];

  const velocityParts: Array<{ traitId: keyof CompetitiveTraits; weight: number; points: number; rationale: string }> = [
    {
      traitId: "execution_velocity",
      weight: WEIGHTS.ExecutionVelocity.execution_velocity,
      points: scoreTrait(traits, "execution_velocity"),
      rationale: "Recent change cadence indicates execution velocity on public surfaces.",
    },
  ];

  return {
    Positioning: {
      dimension: "Positioning",
      score: clampScore(weightedSum(positioningParts.map((p) => ({ weight: p.weight, value: p.points })))),
      ruleId: "SM-POS-001",
      contributions: positioningParts,
    },
    OperationalDepth: {
      dimension: "OperationalDepth",
      score: clampScore(weightedSum(operationalParts.map((p) => ({ weight: p.weight, value: p.points })))),
      ruleId: "SM-OPS-001",
      contributions: operationalParts,
    },
    MonetizationClarity: {
      dimension: "MonetizationClarity",
      score: clampScore(weightedSum(monetizationParts.map((p) => ({ weight: p.weight, value: p.points })))),
      ruleId: "SM-MON-001",
      contributions: monetizationParts,
    },
    MarketFocus: {
      dimension: "MarketFocus",
      score: clampScore(weightedSum(marketFocusParts.map((p) => ({ weight: p.weight, value: p.points })))),
      ruleId: "SM-MKT-001",
      contributions: marketFocusParts,
    },
    CredibilityProof: {
      dimension: "CredibilityProof",
      score: clampScore(weightedSum(credibilityParts.map((p) => ({ weight: p.weight, value: p.points })))),
      ruleId: "SM-CRED-001",
      contributions: credibilityParts,
    },
    ExecutionVelocity: {
      dimension: "ExecutionVelocity",
      score: clampScore(weightedSum(velocityParts.map((p) => ({ weight: p.weight, value: p.points })))),
      ruleId: "SM-VEL-001",
      contributions: velocityParts,
    },
  };
}

