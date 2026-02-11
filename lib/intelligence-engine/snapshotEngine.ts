import crypto from "node:crypto";
import type {
  StrategicDimensions,
  DimensionKey,
  CompetitivePressureResult,
  TrajectoryAnalysis,
} from "@/lib/intelligence-engine";

export interface CompetitiveSnapshot {
  identity_label: string;
  summary: string;
  strengths: string[];
  vulnerabilities: string[];
  competitive_risk_level: "Low" | "Moderate" | "High";
  risk_explanation: string;
  trajectory_signal: string;
  trajectory_explanation: string;
}

function hashIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  const n = parseInt(hex, 16);
  return n % modulo;
}

function identityFromDimensions(dim: StrategicDimensions): string {
  if (dim.monetization_maturity > 70 && dim.strategic_elevation < 40) {
    return "Pricing-Structured Operator";
  }
  if (dim.strategic_elevation > 75 && dim.enterprise_orientation > 70) {
    return "Enterprise Transformation Leader";
  }
  if (dim.vertical_depth > 70 && dim.service_breadth < 50) {
    return "Vertical Specialist";
  }
  if (dim.service_breadth > 70 && dim.vertical_depth < 40) {
    return "Broad Capability Operator";
  }
  return "Balanced Operator";
}

function summaryForIdentity(
  competitorId: string,
  dim: StrategicDimensions,
  identity: string
): string {
  const templates: string[] = [
    `This competitor demonstrates ${level(dim.monetization_maturity)} monetization structure with ${level(
      dim.strategic_elevation
    )} strategic elevation. Current signals suggest a measured positioning rather than aggressive expansion.`,
    `Signals indicate ${level(dim.strategic_elevation)} strategic elevation and ${level(
      dim.vertical_depth
    )} vertical depth, positioning the competitor as a ${identity.toLowerCase()}.`,
    `Overall posture combines ${level(dim.service_breadth)} service breadth with ${level(
      dim.enterprise_orientation
    )} enterprise orientation, resulting in a ${identity.toLowerCase()} profile.`,
  ];
  const idx = hashIndex(`${competitorId}:snapshot_summary`, templates.length);
  return templates[idx];
}

function level(score: number): "low" | "moderate" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  return "low";
}

const dimensionToStrength: Record<DimensionKey, string> = {
  strategic_elevation: "Strong strategic positioning narrative",
  service_breadth: "Broad service coverage",
  vertical_depth: "Clear vertical specialization",
  enterprise_orientation: "Enterprise-oriented messaging",
  monetization_maturity: "Mature pricing structure",
  market_momentum: "Active repositioning signals",
};

export function buildCompetitiveSnapshot(params: {
  competitorId: string;
  dimensions: StrategicDimensions;
  comparisonData: {
    overlappingHighDimensions: DimensionKey[];
    overallPressureLevel: "Low" | "Moderate" | "High";
  };
  evolutionData: TrajectoryAnalysis;
}): CompetitiveSnapshot {
  const { competitorId, dimensions, comparisonData, evolutionData } = params;

  const identity_label = identityFromDimensions(dimensions);
  const summary = summaryForIdentity(competitorId, dimensions, identity_label);

  const entries = Object.entries(dimensions) as [DimensionKey, number][];
  const sortedDescending = [...entries].sort((a, b) => b[1] - a[1]);
  const sortedAscending = [...entries].sort((a, b) => a[1] - b[1]);

  const strengths: string[] = [];
  for (const [key] of sortedDescending.slice(0, 2)) {
    const label = dimensionToStrength[key];
    if (label && !strengths.includes(label)) strengths.push(label);
  }

  const vulnerabilities: string[] = [];
  for (const [key] of sortedAscending.slice(0, 2)) {
    const label = dimensionToStrength[key];
    if (label && !vulnerabilities.includes(label)) {
      vulnerabilities.push(label.replace("Strong ", "").replace("Active ", "Limited "));
    }
  }

  const overlapping = comparisonData.overlappingHighDimensions.length;
  let competitive_risk_level: "Low" | "Moderate" | "High" = "Low";
  if (overlapping >= 2) competitive_risk_level = "High";
  else if (overlapping === 1) competitive_risk_level = "Moderate";

  let risk_explanation = "Competitive pressure from peers currently appears limited.";
  if (competitive_risk_level === "Moderate") {
    risk_explanation =
      "One key strategic area shows overlap with peers; monitor for emerging head-to-head positioning.";
  } else if (competitive_risk_level === "High") {
    risk_explanation =
      "Multiple high-impact dimensions overlap with peers, increasing the risk of direct competitive pressure.";
  }

  let trajectory_signal = "Stable";
  let trajectory_explanation =
    "Recent signals indicate a stable strategic trajectory without pronounced directional shifts.";
  if (evolutionData.accelerationLevel === "Increasing") {
    trajectory_signal = "Gradual Strategic Expansion";
    trajectory_explanation =
      "Signals suggest a measured increase in strategic movement, particularly around priority dimensions.";
  } else if (evolutionData.accelerationLevel === "Rapid") {
    trajectory_signal = "Rapid Repositioning";
    trajectory_explanation =
      "Recent activity indicates accelerated repositioning, with notable shifts in key strategic dimensions.";
  }

  return {
    identity_label,
    summary,
    strengths: strengths.slice(0, 3),
    vulnerabilities: vulnerabilities.slice(0, 3),
    competitive_risk_level,
    risk_explanation,
    trajectory_signal,
    trajectory_explanation,
  };
}

