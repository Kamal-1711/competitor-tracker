import type {
  StrategicRawSignals,
  StrategicModelResult,
  StrategicDimensions,
  TrajectorySnapshot,
} from "./types";
import { computeStrategicDimensions } from "./dimensionModels";
import { computeCompetitivePressure, detectPositioningSaturation } from "./competitivePressure";
import { analyzeTrajectory } from "./trajectory";
import { generateExecutiveBrief } from "./executiveBrief";

export function runStrategicModel(params: {
  raw: StrategicRawSignals;
  peerDimensions?: StrategicDimensions[];
  trajectorySnapshots?: TrajectorySnapshot[];
}): StrategicModelResult {
  const { raw } = params;
  const peerDims = params.peerDimensions ?? [];
  const trajectorySnapshots =
    params.trajectorySnapshots ?? [
      {
        capturedAt: new Date().toISOString(),
        dimensions: computeStrategicDimensions(raw).dimensions,
      },
    ];

  const dimensionsResult = computeStrategicDimensions(raw);
  const pressure = computeCompetitivePressure(dimensionsResult.dimensions, peerDims);
  const saturation = detectPositioningSaturation([dimensionsResult.dimensions, ...peerDims]);
  const trajectory = analyzeTrajectory(trajectorySnapshots);

  const brief = generateExecutiveBrief({
    competitorId: raw.competitorId,
    dimensions: dimensionsResult.dimensions,
    pressure,
    trajectory,
    saturation,
    flags: dimensionsResult.flags,
  });

  return {
    dimensionsResult,
    pressure,
    saturation,
    trajectory,
    brief,
  };
}

