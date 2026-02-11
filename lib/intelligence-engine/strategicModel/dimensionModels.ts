import type { EvidenceItem } from "../traitEngine";
import type {
  StrategicDimensions,
  StrategicRawSignals,
  StrategicDimensionsResult,
  DimensionKey,
  DimensionScoreDetail,
} from "./types";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeStrategicElevation(raw: StrategicRawSignals): DimensionScoreDetail {
  const strategic = raw.strategicTerms;
  const lifecycle = raw.lifecycleTerms;
  const execution = raw.executionTerms;

  const scoreRaw = strategic * 2.0 + lifecycle * 1.5 - execution * 0.5;

  // Simple normalization: assume typical max around 40, cap to 100.
  const normalized = clampScore((scoreRaw / 40) * 100);

  const evidence: EvidenceItem[] = [
    { source: "services_snapshot", key: "strategic_terms", value: strategic },
    { source: "services_snapshot", key: "lifecycle_terms", value: lifecycle },
    { source: "services_snapshot", key: "execution_terms", value: execution },
  ];

  return {
    dimension: "strategic_elevation",
    score: normalized,
    evidence,
  };
}

function computeServiceBreadth(
  raw: StrategicRawSignals,
  verticalDepthScore: number
): { detail: DimensionScoreDetail; flags: string[] } {
  const flags: string[] = [];
  const serviceCount = raw.serviceCount;

  let score = Math.min(serviceCount * 10, 100);
  if (serviceCount > 10) {
    // Dampening: above 10 services, flatten growth.
    score = clampScore(80 + (serviceCount - 10) * 2);
  }

  if (serviceCount > 8 && verticalDepthScore < 40) {
    flags.push("breadth_without_focus");
  }

  const evidence: EvidenceItem[] = [
    { source: "services_snapshot", key: "service_count", value: serviceCount },
  ];

  return {
    detail: {
      dimension: "service_breadth",
      score,
      evidence,
    },
    flags,
  };
}

function computeVerticalDepth(raw: StrategicRawSignals): DimensionScoreDetail {
  const industriesCount = raw.industriesDetected.length;
  const score =
    industriesCount === 0 ? 10 : Math.min(industriesCount * 20, 100);

  const evidence: EvidenceItem[] = [
    { source: "services_snapshot", key: "industries_detected", value: raw.industriesDetected },
  ];

  return {
    dimension: "vertical_depth",
    score,
    evidence,
  };
}

function computeEnterpriseOrientation(raw: StrategicRawSignals): DimensionScoreDetail {
  const enterpriseKw = raw.enterpriseKeywords;
  const cases = raw.caseStudiesPresent ? 1 : 0;
  const certs = raw.certificationsCount;

  const scoreRaw = enterpriseKw * 3 + cases * 10 + certs * 15;
  // Assume scoreRaw ~ 100 is already strong; normalize accordingly.
  const normalized = clampScore((scoreRaw / 100) * 100);

  const evidence: EvidenceItem[] = [
    { source: "services_snapshot", key: "enterprise_keywords", value: enterpriseKw },
    { source: "case_studies", key: "case_studies_present", value: raw.caseStudiesPresent },
    { source: "case_studies", key: "certifications_count", value: certs },
  ];

  return {
    dimension: "enterprise_orientation",
    score: normalized,
    evidence,
  };
}

function computeMonetizationMaturity(raw: StrategicRawSignals): DimensionScoreDetail {
  let base = raw.pricingTransparent ? 60 : 30;
  if (raw.multipleTiersDetected) base += 20;
  if (raw.enterpriseTierDetected) base += 10;

  const score = clampScore(base);

  const evidence: EvidenceItem[] = [
    { source: "pricing", key: "pricing_transparent", value: raw.pricingTransparent },
    { source: "pricing", key: "multiple_tiers_detected", value: raw.multipleTiersDetected },
    { source: "pricing", key: "enterprise_tier_detected", value: raw.enterpriseTierDetected },
  ];

  return {
    dimension: "monetization_maturity",
    score,
    evidence,
  };
}

function computeMarketMomentum(raw: StrategicRawSignals): DimensionScoreDetail {
  const base = raw.recentChangeCount30d * 15;
  const structuralBonus = raw.structuralTraitShiftsDetected ? 20 : 0;
  const score = clampScore(base + structuralBonus);

  const evidence: EvidenceItem[] = [
    { source: "changes", key: "recent_change_count_30d", value: raw.recentChangeCount30d },
    {
      source: "changes",
      key: "structural_trait_shifts_detected",
      value: raw.structuralTraitShiftsDetected,
    },
  ];

  return {
    dimension: "market_momentum",
    score,
    evidence,
  };
}

export function computeStrategicDimensions(raw: StrategicRawSignals): StrategicDimensionsResult {
  const verticalDetail = computeVerticalDepth(raw);
  const { detail: breadthDetail, flags } = computeServiceBreadth(raw, verticalDetail.score);
  const elevationDetail = computeStrategicElevation(raw);
  const enterpriseDetail = computeEnterpriseOrientation(raw);
  const monetizationDetail = computeMonetizationMaturity(raw);
  const momentumDetail = computeMarketMomentum(raw);

  const details: DimensionScoreDetail[] = [
    elevationDetail,
    breadthDetail,
    verticalDetail,
    enterpriseDetail,
    monetizationDetail,
    momentumDetail,
  ];

  const dimensions: StrategicDimensions = {
    strategic_elevation: elevationDetail.score,
    service_breadth: breadthDetail.score,
    vertical_depth: verticalDetail.score,
    enterprise_orientation: enterpriseDetail.score,
    monetization_maturity: monetizationDetail.score,
    market_momentum: momentumDetail.score,
  };

  const evidence: EvidenceItem[] = details.flatMap((d) => d.evidence);

  return {
    dimensions,
    details,
    flags,
    evidence,
  };
}

