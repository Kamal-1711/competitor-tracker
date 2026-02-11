import type { CompetitiveTraits } from "./traitEngine";
import type { ScoreCard } from "./scoringModel";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type ConfidenceResult = {
  level: ConfidenceLevel;
  ruleId: string;
  reasons: string[];
  signalsUsedCount: number;
  scoreSpread: number; // abs(top-bottom)
};

function computeSignalsUsedCount(traits: CompetitiveTraits): number {
  let count = 0;
  if (traits.messaging_emphasis.value !== "unknown") count += 1;
  if (traits.gtm_motion.value !== "unknown") count += 1;
  if (traits.monetization_signal.value !== "unknown") count += 1;
  if (traits.service_breadth.value !== "unknown") count += 1;
  if (traits.vertical_focus.value !== "unknown") count += 1;
  if (traits.credibility_surface.value !== "unknown") count += 1;
  return count;
}

function computeSpread(scores: ScoreCard): number {
  const values = Object.values(scores).map((s) => s.score);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return Math.abs(max - min);
}

export function computeConfidence(params: { traits: CompetitiveTraits; scores: ScoreCard }): ConfidenceResult {
  const signalsUsedCount = computeSignalsUsedCount(params.traits);
  const spread = computeSpread(params.scores);

  const reasons: string[] = [];
  if (params.traits.bot_mitigation_block.value === "blocked") {
    reasons.push("Bot mitigation appears to block some high-impact pages.");
  }
  if (signalsUsedCount >= 5) reasons.push("Multiple independent signals are available.");
  if (signalsUsedCount <= 2) reasons.push("Signal coverage is thin; interpretation is constrained.");
  if (spread >= 25) reasons.push("Score margins are meaningful across dimensions.");
  if (spread < 15) reasons.push("Score margins are tight; differentiation is limited.");

  let level: ConfidenceLevel = "Medium";
  if (params.traits.bot_mitigation_block.value === "blocked") {
    level = signalsUsedCount >= 4 ? "Medium" : "Low";
  } else if (signalsUsedCount >= 5 && spread >= 20) {
    level = "High";
  } else if (signalsUsedCount <= 2) {
    level = "Low";
  }

  return {
    level,
    ruleId: "CM-001",
    reasons,
    signalsUsedCount,
    scoreSpread: spread,
  };
}

