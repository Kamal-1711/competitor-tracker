import type { SEODimensions } from "./seoScoringEngine";

export interface SEOSnapshotRecord {
  captured_at: string;
  dimensions: SEODimensions;
}

export interface SeoEvolutionResult {
  dominant_trend: keyof SEODimensions | null;
  expansion_signal: string;
  acceleration_level: "Stable" | "Increasing" | "Rapid";
}

export function analyzeSeoEvolution(snapshots: SEOSnapshotRecord[]): SeoEvolutionResult {
  if (!snapshots || snapshots.length < 2) {
    return {
      dominant_trend: null,
      expansion_signal: "Not enough history to infer SEO evolution.",
      acceleration_level: "Stable",
    };
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );
  const first = sorted[0].dimensions;
  const last = sorted[sorted.length - 1].dimensions;

  const deltas: { key: keyof SEODimensions; delta: number }[] = [];
  for (const key of Object.keys(first) as (keyof SEODimensions)[]) {
    deltas.push({ key, delta: (last[key] ?? 0) - (first[key] ?? 0) });
  }

  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = deltas[0];

  let acceleration_level: "Stable" | "Increasing" | "Rapid" = "Stable";
  let expansion_signal = "SEO posture appears broadly stable over the observed period.";

  if (top && Math.abs(top.delta) >= 10) {
    acceleration_level = "Increasing";
    expansion_signal = "Signals indicate a measured expansion of SEO investment and focus.";
  }
  if (top && Math.abs(top.delta) >= 25) {
    acceleration_level = "Rapid";
    expansion_signal =
      "Signals indicate accelerated SEO expansion, with marked shifts in priority dimensions.";
  }

  return {
    dominant_trend: top?.delta ? top.key : null,
    expansion_signal,
    acceleration_level,
  };
}

