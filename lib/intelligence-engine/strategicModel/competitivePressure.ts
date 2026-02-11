import type {
  StrategicDimensions,
  CompetitivePressureArea,
  CompetitivePressureResult,
  SaturationRisk,
} from "./types";

function dimensionKeys(): (keyof StrategicDimensions)[] {
  return [
    "strategic_elevation",
    "service_breadth",
    "vertical_depth",
    "enterprise_orientation",
    "monetization_maturity",
    "market_momentum",
  ];
}

export function computeCompetitivePressure(
  selfDims: StrategicDimensions,
  others: StrategicDimensions[]
): CompetitivePressureResult {
  if (!others.length) {
    return {
      highestPressureDimension: null,
      overallPressureLevel: "Low",
      areas: [],
    };
  }

  const areas: CompetitivePressureArea[] = [];

  for (const dim of dimensionKeys()) {
    const avgCompetitorScore =
      others.reduce((sum, d) => sum + d[dim], 0) / others.length;
    const pressure = avgCompetitorScore - selfDims[dim];
    areas.push({ dimension: dim, pressure: Math.round(pressure) });
  }

  const positiveAreas = areas.filter((a) => a.pressure > 0);
  if (!positiveAreas.length) {
    return {
      highestPressureDimension: null,
      overallPressureLevel: "Low",
      areas,
    };
  }

  const highest = positiveAreas.reduce((max, a) =>
    a.pressure > max.pressure ? a : max
  );

  let overallPressureLevel: CompetitivePressureResult["overallPressureLevel"] =
    "Low";
  if (highest.pressure >= 25) overallPressureLevel = "High";
  else if (highest.pressure >= 10) overallPressureLevel = "Moderate";

  return {
    highestPressureDimension: highest.dimension,
    overallPressureLevel,
    areas,
  };
}

export function detectPositioningSaturation(
  allDims: StrategicDimensions[]
): SaturationRisk | null {
  if (!allDims.length) return null;

  const saturated = allDims.filter(
    (d) => d.strategic_elevation > 75 && d.enterprise_orientation > 70
  ).length;

  if (saturated >= 2) {
    return {
      hasEnterpriseSaturation: true,
      saturatedCompetitorCount: saturated,
    };
  }

  return null;
}

