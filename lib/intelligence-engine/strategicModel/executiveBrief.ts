import crypto from "node:crypto";
import type {
  StrategicDimensions,
  CompetitivePressureResult,
  TrajectoryAnalysis,
  SaturationRisk,
  ExecutiveBrief,
} from "./types";

function hashIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  const n = parseInt(hex, 16);
  return n % modulo;
}

function level(score: number): "low" | "moderate" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  return "low";
}

export function generateExecutiveBrief(params: {
  competitorId: string;
  dimensions: StrategicDimensions;
  pressure: CompetitivePressureResult;
  trajectory: TrajectoryAnalysis;
  saturation: SaturationRisk | null;
  flags: string[];
}): ExecutiveBrief {
  const { competitorId, dimensions, pressure, trajectory, saturation, flags } = params;

  // Archetype based on dominant dimensions.
  let archetype = "Balanced operator";
  if (dimensions.strategic_elevation >= 75 && dimensions.enterprise_orientation >= 70) {
    archetype = "Enterprise strategic transformer";
  } else if (
    dimensions.service_breadth >= 70 &&
    dimensions.vertical_depth < 40
  ) {
    archetype = "Broad portfolio generalist";
  } else if (dimensions.vertical_depth >= 60) {
    archetype = "Segment-focused specialist";
  }

  const identityTemplates = [
    `Competitor demonstrates ${level(dimensions.strategic_elevation)} strategic elevation with ${level(
      dimensions.vertical_depth
    )} vertical depth.`,
    `Strategic posture skews toward ${level(
      dimensions.strategic_elevation
    )} elevation and ${level(dimensions.service_breadth)} service breadth.`,
  ];
  const identityIdx = hashIndex(`${competitorId}:identity`, identityTemplates.length);

  const marketPositionTemplates = [
    `Enterprise orientation is ${level(
      dimensions.enterprise_orientation
    )}, with monetization maturity at ${level(dimensions.monetization_maturity)}.`,
    `Positioning leans ${level(
      dimensions.enterprise_orientation
    )} on enterprise focus and ${level(dimensions.monetization_maturity)} on pricing maturity.`,
  ];
  const positionIdx = hashIndex(`${competitorId}:position`, marketPositionTemplates.length);

  const pressureLine =
    pressure.highestPressureDimension && pressure.overallPressureLevel !== "Low"
      ? `Competitive pressure is strongest in ${pressure.highestPressureDimension.replace(
          /_/g,
          " "
        )}, at a ${pressure.overallPressureLevel.toLowerCase()} level.`
      : "Competitive pressure from tracked peers currently appears limited.";

  const evolutionLine =
    trajectory.dominantTrendDimension != null && trajectory.accelerationLevel !== "Stable"
      ? `Recent momentum indicates ${trajectory.accelerationLevel.toLowerCase()} movement in ${trajectory.dominantTrendDimension.replace(
          /_/g,
          " "
        )}.`
      : "Recent momentum suggests a stable strategic posture over the latest period.";

  const riskLines: string[] = [];
  if (flags.includes("breadth_without_focus")) {
    riskLines.push("Breadth without clear vertical focus may diffuse positioning.");
  }
  if (saturation?.hasEnterpriseSaturation) {
    riskLines.push("Enterprise transformation positioning is becoming crowded among tracked peers.");
  }
  // Cap maximum flags to 3
  const structuralRisks =
    riskLines.length > 0
      ? riskLines.slice(0, 3)
      : ["No immediate structural risks are apparent from current signals."];

  return {
    archetype,
    sections: [
      {
        title: "Strategic Identity",
        lines: [identityTemplates[identityIdx]],
      },
      {
        title: "Market Position",
        lines: [marketPositionTemplates[positionIdx]],
      },
      {
        title: "Competitive Pressure",
        lines: [pressureLine],
      },
      {
        title: "Evolution Signal",
        lines: [evolutionLine],
      },
      {
        title: "Structural Risks",
        lines: structuralRisks,
      },
    ],
  };
}

