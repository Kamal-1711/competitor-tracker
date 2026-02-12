export { buildRawSignals } from "./signalProcessor";
export type {
  RawSignals,
  RawSignalsInput,
  SnapshotSignal,
  ServiceSnapshotSignal,
  WebpageSignalInsight,
} from "./signalProcessor";

export { deriveCompetitiveTraits } from "./traitEngine";
export type { CompetitiveTraits, Trait, EvidenceItem } from "./traitEngine";

export { computeScores } from "./scoringModel";
export type { ScoreCard, ScoreDimension, DimensionScore } from "./scoringModel";

export { rankStrengthsAndRisks } from "./rankingEngine";
export type { RankedItem } from "./rankingEngine";

export { composeNarrative } from "./narrativeComposer";
export type { NarrativeLine } from "./narrativeComposer";

export { computeConfidence } from "./confidenceModel";
export type { ConfidenceResult, ConfidenceLevel } from "./confidenceModel";

export { runIntelligenceEngine } from "./intelligenceOrchestrator";
export type { IntelligenceReport, TraceEvent } from "./intelligenceOrchestrator";

export * as BaselineProfile from "./baselineProfile/orchestrator";
export type {
  CompanyBaselineProfile,
  AboutSnapshot,
  IndustryProfile,
  TargetSegmentProfile,
  OfferingProfile,
  ValuePropProfile,
  TrustProfile,
  TrustIndicators,
} from "./baselineProfile/types";

export * as StrategicModel from "./strategicModel/orchestrator";
export type {
  StrategicDimensions,
  DimensionKey,
  StrategicRawSignals,
  StrategicModelResult,
  CompetitivePressureResult,
  TrajectoryAnalysis,
  SaturationRisk,
} from "./strategicModel/types";

export { buildCompetitiveSnapshot } from "./snapshotEngine";
export type { CompetitiveSnapshot } from "./snapshotEngine";

export * as SearchIntelligence from "./searchIntelligence/seoSnapshotComposer";
export type {
  SEOSnapshot,
  SeoIntelligenceResult,
} from "./searchIntelligence/seoSnapshotComposer";
export type { SEOPageData } from "./searchIntelligence/contentCrawler";
export type {
  DomainKeywordProfile,
  TopicClusterScore,
  ContentGapResult,
} from "./searchIntelligence/onSiteKeywordEngine";

