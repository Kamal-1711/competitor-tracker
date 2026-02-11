import type { CompetitiveTraits } from "./traitEngine";
import type { ScoreCard, ScoreDimension } from "./scoringModel";

export type RankedItem = {
  id: string;
  kind: "strength" | "risk" | "imbalance";
  dimension?: ScoreDimension;
  severity: number; // 0..100
  ruleId: string;
  evidence: Array<{ traitId?: keyof CompetitiveTraits; dimension?: ScoreDimension; value: unknown }>;
};

function sortByScoreDesc(scores: Array<{ dimension: ScoreDimension; score: number }>) {
  return [...scores].sort((a, b) => b.score - a.score);
}

function sortByScoreAsc(scores: Array<{ dimension: ScoreDimension; score: number }>) {
  return [...scores].sort((a, b) => a.score - b.score);
}

export function rankStrengthsAndRisks(params: {
  traits: CompetitiveTraits;
  scores: ScoreCard;
}): {
  strengths: RankedItem[];
  risks: RankedItem[];
  imbalances: RankedItem[];
} {
  const dims: Array<{ dimension: ScoreDimension; score: number }> = Object.values(params.scores).map((d) => ({
    dimension: d.dimension,
    score: d.score,
  }));

  const top = sortByScoreDesc(dims).slice(0, 3);
  const bottom = sortByScoreAsc(dims).slice(0, 3);

  const strengths: RankedItem[] = top.map((t) => ({
    id: `strength_${t.dimension}`,
    kind: "strength",
    dimension: t.dimension,
    severity: t.score,
    ruleId: "RE-RANK-STR-001",
    evidence: [{ dimension: t.dimension, value: t.score }],
  }));

  const risks: RankedItem[] = bottom.map((b) => ({
    id: `risk_${b.dimension}`,
    kind: "risk",
    dimension: b.dimension,
    severity: 100 - b.score,
    ruleId: "RE-RANK-RISK-001",
    evidence: [{ dimension: b.dimension, value: b.score }],
  }));

  const imbalances: RankedItem[] = [];

  // Imbalance pattern: broad services + weak market focus.
  if (params.traits.service_breadth.value === "broad" && params.scores.MarketFocus.score <= 55) {
    imbalances.push({
      id: "imbalance_broad_no_focus",
      kind: "imbalance",
      severity: 70,
      ruleId: "RE-IMB-001",
      evidence: [
        { traitId: "service_breadth", value: params.traits.service_breadth.value },
        { dimension: "MarketFocus", value: params.scores.MarketFocus.score },
      ],
    });
  }

  // Imbalance pattern: strong monetization clarity + low credibility proof.
  if (params.scores.MonetizationClarity.score >= 70 && params.scores.CredibilityProof.score <= 50) {
    imbalances.push({
      id: "imbalance_monetization_no_proof",
      kind: "imbalance",
      severity: 65,
      ruleId: "RE-IMB-002",
      evidence: [
        { dimension: "MonetizationClarity", value: params.scores.MonetizationClarity.score },
        { dimension: "CredibilityProof", value: params.scores.CredibilityProof.score },
      ],
    });
  }

  return { strengths, risks, imbalances };
}

