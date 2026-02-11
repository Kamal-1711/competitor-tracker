import type { EvidenceItem } from "../traitEngine";

export interface StrategicDimensions {
  strategic_elevation: number; // 0–100
  service_breadth: number;
  vertical_depth: number;
  enterprise_orientation: number;
  monetization_maturity: number;
  market_momentum: number;
}

/**
 * Normalized, pre-aggregated signals flowing into the strategic model.
 * These are derived from baseline profiles, service snapshots, pricing insights, and change history.
 */
export interface StrategicRawSignals {
  competitorId: string;

  // Strategic Elevation inputs
  strategicTerms: number;
  executionTerms: number;
  lifecycleTerms: number;

  // Service breadth / vertical depth
  serviceCount: number;
  industriesDetected: string[];

  // Enterprise orientation
  enterpriseKeywords: number;
  caseStudiesPresent: boolean;
  certificationsCount: number;

  // Monetization maturity
  pricingTransparent: boolean;
  multipleTiersDetected: boolean;
  enterpriseTierDetected: boolean;

  // Market momentum
  recentChangeCount30d: number;
  structuralTraitShiftsDetected: boolean;
}

export type DimensionKey = keyof StrategicDimensions;

export interface DimensionScoreDetail {
  dimension: DimensionKey;
  score: number;
  evidence: EvidenceItem[];
}

export interface StrategicDimensionsResult {
  dimensions: StrategicDimensions;
  details: DimensionScoreDetail[];
  flags: string[]; // e.g. ["breadth_without_focus"]
  evidence: EvidenceItem[];
}

export interface CompetitivePressureArea {
  dimension: DimensionKey;
  pressure: number;
}

export interface CompetitivePressureResult {
  highestPressureDimension: DimensionKey | null;
  overallPressureLevel: "Low" | "Moderate" | "High";
  areas: CompetitivePressureArea[];
}

export interface SaturationRisk {
  hasEnterpriseSaturation: boolean;
  saturatedCompetitorCount: number;
}

export interface TrajectorySnapshot {
  capturedAt: string;
  dimensions: StrategicDimensions;
}

export interface TrajectoryAnalysis {
  dominantTrendDimension: DimensionKey | null;
  accelerationLevel: "Stable" | "Increasing" | "Rapid";
}

export interface ExecutiveBriefSection {
  title: string;
  lines: string[];
}

export interface ExecutiveBrief {
  sections: ExecutiveBriefSection[];
  archetype: string;
}

export interface StrategicModelResult {
  dimensionsResult: StrategicDimensionsResult;
  pressure: CompetitivePressureResult;
  saturation: SaturationRisk | null;
  trajectory: TrajectoryAnalysis;
  brief: ExecutiveBrief;
}

