import type { TrajectoryAnalysis, TrajectorySnapshot, DimensionKey } from "./types";

function dimensionKeys(): DimensionKey[] {
  return [
    "strategic_elevation",
    "service_breadth",
    "vertical_depth",
    "enterprise_orientation",
    "monetization_maturity",
    "market_momentum",
  ];
}

export function analyzeTrajectory(snapshots: TrajectorySnapshot[]): TrajectoryAnalysis {
  if (snapshots.length < 2) {
    // With fewer than 2 points, treat as stable and pick the strongest dimension as the \"trend\".
      const latest = snapshots[0];
      if (!latest) {
        return { dominantTrendDimension: null, accelerationLevel: "Stable" };
      }
      let dominant: DimensionKey | null = null;
      let maxScore = -1;
      for (const key of dimensionKeys()) {
        const value = latest.dimensions[key];
        if (value > maxScore) {
          maxScore = value;
          dominant = key;
        }
      }
      return {
        dominantTrendDimension: dominant,
        accelerationLevel: "Stable",
      };
  }

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  let dominant: DimensionKey | null = null;
  let maxDelta = 0;

  for (const key of dimensionKeys()) {
    const delta = latest.dimensions[key] - prev.dimensions[key];
    if (delta > maxDelta) {
      maxDelta = delta;
      dominant = key;
    }
  }

  let accelerationLevel: TrajectoryAnalysis["accelerationLevel"] = "Stable";
  if (maxDelta >= 15) accelerationLevel = "Rapid";
  else if (maxDelta >= 5) accelerationLevel = "Increasing";

  return {
    dominantTrendDimension: dominant,
    accelerationLevel,
  };
}

