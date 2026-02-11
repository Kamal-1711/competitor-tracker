import type { RawSignals } from "./signalProcessor";
import { deriveCompetitiveTraits, type CompetitiveTraits } from "./traitEngine";
import { computeScores, type ScoreCard } from "./scoringModel";
import { rankStrengthsAndRisks, type RankedItem } from "./rankingEngine";
import { composeNarrative, type NarrativeLine } from "./narrativeComposer";
import { computeConfidence, type ConfidenceResult } from "./confidenceModel";

export type TraceEvent = {
  step:
    | "signals"
    | "traits"
    | "scores"
    | "ranking"
    | "narrative"
    | "confidence";
  ruleId: string;
  message: string;
  data?: unknown;
};

export type IntelligenceReport = {
  competitorId: string;
  raw: RawSignals;
  traits: CompetitiveTraits;
  scores: ScoreCard;
  ranking: {
    strengths: RankedItem[];
    risks: RankedItem[];
    imbalances: RankedItem[];
  };
  narrative: {
    strengths: NarrativeLine[];
    risks: NarrativeLine[];
    strategicImplications: NarrativeLine[];
  };
  confidence: ConfidenceResult;
  trace: TraceEvent[];
};

/**
 * Deterministic pipeline:
 * Raw -> Traits -> Scores -> Ranking -> Narrative -> Confidence
 *
 * No randomness, no time-based logic, no external API calls.
 */
export function runIntelligenceEngine(raw: RawSignals): IntelligenceReport {
  const trace: TraceEvent[] = [
    {
      step: "signals",
      ruleId: "ORCH-001",
      message: "Starting deterministic intelligence pipeline.",
      data: {
        trackedPageTypes: raw.trackedPageTypes,
        changesLast30dCount: raw.changesLast30dCount,
      },
    },
  ];

  const traits = deriveCompetitiveTraits(raw);
  trace.push({
    step: "traits",
    ruleId: "ORCH-TRAITS-001",
    message: "Derived competitive traits from raw signals.",
    data: Object.values(traits).map((t) => ({ id: t.id, value: t.value, ruleId: t.ruleId })),
  });

  const scores = computeScores(traits);
  trace.push({
    step: "scores",
    ruleId: "ORCH-SCORES-001",
    message: "Computed weighted dimension scores.",
    data: Object.values(scores).map((s) => ({ dimension: s.dimension, score: s.score, ruleId: s.ruleId })),
  });

  const ranking = rankStrengthsAndRisks({ traits, scores });
  trace.push({
    step: "ranking",
    ruleId: "ORCH-RANK-001",
    message: "Ranked strengths, risks, and imbalance patterns.",
    data: {
      strengths: ranking.strengths.map((s) => ({ id: s.id, dimension: s.dimension, severity: s.severity })),
      risks: ranking.risks.map((r) => ({ id: r.id, dimension: r.dimension, severity: r.severity })),
      imbalances: ranking.imbalances.map((i) => ({ id: i.id, severity: i.severity, ruleId: i.ruleId })),
    },
  });

  const narrative = composeNarrative({
    competitorId: raw.competitorId,
    traits,
    scores,
    ranked: ranking,
  });
  trace.push({
    step: "narrative",
    ruleId: "ORCH-NARR-001",
    message: "Composed deterministic narrative from ranking outputs.",
    data: {
      strengths: narrative.strengths.map((l) => ({ id: l.id, templateId: l.templateId })),
      risks: narrative.risks.map((l) => ({ id: l.id, templateId: l.templateId })),
      implications: narrative.implications.map((l) => ({ id: l.id, templateId: l.templateId })),
    },
  });

  const confidence = computeConfidence({ traits, scores });
  trace.push({
    step: "confidence",
    ruleId: confidence.ruleId,
    message: `Computed confidence: ${confidence.level}.`,
    data: confidence,
  });

  return {
    competitorId: raw.competitorId,
    raw,
    traits,
    scores,
    ranking,
    narrative: {
      strengths: narrative.strengths,
      risks: narrative.risks,
      strategicImplications: narrative.implications,
    },
    confidence,
    trace,
  };
}

