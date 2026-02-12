import crypto from "node:crypto";
import type { CompetitiveTraits } from "./traitEngine";
import type { RankedItem } from "./rankingEngine";
import type { ScoreCard, ScoreDimension } from "./scoringModel";

export type NarrativeLine = {
  id: string;
  kind: "strength" | "risk" | "imbalance" | "implication";
  text: string;
  templateId: string;
  ruleId: string;
  evidence: RankedItem["evidence"];
};

function stableIndex(seed: string, modulo: number): number {
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  const n = parseInt(hex, 16);
  return modulo <= 0 ? 0 : n % modulo;
}

function dimensionLabel(d: ScoreDimension): string {
  switch (d) {
    case "OperationalDepth":
      return "Operational depth";
    case "MonetizationClarity":
      return "Monetization clarity";
    case "MarketFocus":
      return "Market focus";
    case "CredibilityProof":
      return "Credibility proof";
    case "ExecutionVelocity":
      return "Execution velocity";
    case "Positioning":
    default:
      return "Positioning";
  }
}

const STRENGTH_TEMPLATES: Record<ScoreDimension, string[]> = {
  Positioning: [
    "Positioning appears coherent across public surfaces, supported by consistent messaging cues.",
    "Public-facing positioning reads as intentional and cohesive, reducing ambiguity for buyers.",
  ],
  OperationalDepth: [
    "Service structure suggests meaningful operational depth and delivery surface area.",
    "Offering breadth indicates a mature delivery footprint rather than a narrow point solution.",
  ],
  MonetizationClarity: [
    "Monetization signals are legible, making packaging and conversion intent easy to infer.",
    "Pricing/CTA signals present a clear conversion path and packaging posture.",
  ],
  MarketFocus: [
    "Market focus signals indicate a defined segment orientation rather than broad generalism.",
    "Segment cues suggest the competitor knows where it wins and is reinforcing that framing.",
  ],
  CredibilityProof: [
    "Credibility surfaces suggest proof-building is part of their go-to-market narrative.",
    "Customer proof is present, strengthening trust signals for enterprise buyers.",
  ],
  ExecutionVelocity: [
    "Change cadence suggests active execution on public-facing strategy surfaces.",
    "Recent activity indicates ongoing iteration rather than a static posture.",
  ],
};

const RISK_TEMPLATES: Record<ScoreDimension, string[]> = {
  Positioning: [
    "Positioning signals are thin or inconsistent, making intent harder to interpret reliably.",
    "Messaging cues do not strongly differentiate the offer, increasing ambiguity.",
  ],
  OperationalDepth: [
    "Service structure does not yet indicate broad depth; capability surface may be narrower.",
    "Delivery footprint appears limited or under-articulated in current service pages.",
  ],
  MonetizationClarity: [
    "Monetization posture is not strongly signaled; packaging intent may be opaque to buyers.",
    "Pricing and conversion cues are weak, which can slow qualification or reduce urgency.",
  ],
  MarketFocus: [
    "Vertical focus is not clearly articulated, suggesting broader or less targeted framing.",
    "Segment emphasis appears diffuse, which can dilute relevance in high-intent markets.",
  ],
  CredibilityProof: [
    "Proof surfaces are limited; credibility relies more on claims than demonstrated outcomes.",
    "Customer evidence is not strongly present, which can weaken trust for higher-stakes deals.",
  ],
  ExecutionVelocity: [
    "Low visible change cadence suggests slower iteration on public strategy surfaces.",
    "Limited surface movement suggests stability, but reduces observable experimentation signals.",
  ],
};

const IMBALANCE_TEMPLATES: Record<string, string[]> = {
  imbalance_broad_no_focus: [
    "Broad service surface without clear vertical emphasis can read as generalist positioning.",
    "Breadth is evident, but segment clarity is limited—this can dilute buyer relevance.",
  ],
  imbalance_monetization_no_proof: [
    "Packaging signals are clear, but proof surfaces are weaker—this can increase buyer skepticism.",
    "Monetization intent is legible, yet credibility cues lag, potentially slowing enterprise conversion.",
  ],
};

export function composeNarrative(params: {
  competitorId: string;
  traits: CompetitiveTraits;
  scores: ScoreCard;
  ranked: { strengths: RankedItem[]; risks: RankedItem[]; imbalances: RankedItem[] };
}): {
  strengths: NarrativeLine[];
  risks: NarrativeLine[];
  implications: NarrativeLine[];
} {
  const strengths: NarrativeLine[] = params.ranked.strengths
    .filter((s): s is RankedItem & { dimension: ScoreDimension } => Boolean(s.dimension))
    .map((s) => {
      const templates = STRENGTH_TEMPLATES[s.dimension];
      const idx = stableIndex(`${params.competitorId}:${s.id}`, templates.length);
      return {
        id: s.id,
        kind: "strength",
        text: templates[idx],
        templateId: `NC-STR-${s.dimension}-${idx}`,
        ruleId: "NC-STR-001",
        evidence: s.evidence,
      };
    });

  const risks: NarrativeLine[] = params.ranked.risks
    .filter((r): r is RankedItem & { dimension: ScoreDimension } => Boolean(r.dimension))
    .map((r) => {
      const templates = RISK_TEMPLATES[r.dimension];
      const idx = stableIndex(`${params.competitorId}:${r.id}`, templates.length);
      return {
        id: r.id,
        kind: "risk",
        text: templates[idx],
        templateId: `NC-RISK-${r.dimension}-${idx}`,
        ruleId: "NC-RISK-001",
        evidence: r.evidence,
      };
    });

  const imbalanceLines: NarrativeLine[] = params.ranked.imbalances.map((i) => {
    const templates = IMBALANCE_TEMPLATES[i.id] ?? [
      "An imbalance pattern was detected based on the current strategic signal mix.",
    ];
    const idx = stableIndex(`${params.competitorId}:${i.id}`, templates.length);
    return {
      id: i.id,
      kind: "imbalance",
      text: templates[idx],
      templateId: `NC-IMB-${i.id}-${idx}`,
      ruleId: i.ruleId,
      evidence: i.evidence,
    };
  });

  // Deterministic implications: translate highest + lowest dimension into neutral implications.
  const allDims = Object.values(params.scores).map((d) => ({ dim: d.dimension, score: d.score }));
  const top = [...allDims].sort((a, b) => b.score - a.score)[0];
  const bottom = [...allDims].sort((a, b) => a.score - b.score)[0];

  const implications: NarrativeLine[] = [
    {
      id: "implication_top",
      kind: "implication",
      text: `Primary strength signal concentrates in ${dimensionLabel(top.dim)}.`,
      templateId: "NC-IMP-001",
      ruleId: "NC-IMP-001",
      evidence: [{ dimension: top.dim, value: top.score }],
    },
    {
      id: "implication_bottom",
      kind: "implication",
      text: `Primary risk signal concentrates in ${dimensionLabel(bottom.dim)}.`,
      templateId: "NC-IMP-002",
      ruleId: "NC-IMP-002",
      evidence: [{ dimension: bottom.dim, value: bottom.score }],
    },
    ...imbalanceLines,
  ];

  // If bot mitigation blocks key pages, add a deterministic caveat.
  if (params.traits.bot_mitigation_block.value === "blocked") {
    implications.push({
      id: "implication_quality_blocked",
      kind: "implication",
      text: "Some high-impact pages appear protected by bot mitigation; interpretation is constrained to partial signals.",
      templateId: "NC-QUAL-001",
      ruleId: "NC-QUAL-001",
      evidence: params.traits.bot_mitigation_block.evidence.map((e) => ({ value: e.value })),
    });
  }

  return { strengths, risks, implications };
}

