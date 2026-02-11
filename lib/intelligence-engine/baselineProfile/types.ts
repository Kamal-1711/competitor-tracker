export type BaselineEvidence = {
  source:
    | "homepage"
    | "about"
    | "services"
    | "nav"
    | "case_studies"
    | "footer"
    | "snapshot";
  key: string;
  value: unknown;
};

export type AboutSnapshot = {
  company_summary_raw: string | null;
  founding_year: number | null;
  detected_regions: string[];
  mission_keywords: string[];
  company_size_signals: string[];
  ruleId: string;
  evidence: BaselineEvidence[];
};

export type IndustryProfile = {
  primary_industry: string | null;
  secondary_industries: string[];
  industry_confidence: "High" | "Medium" | "Low";
  ruleId: string;
  evidence: BaselineEvidence[];
};

export type TargetSegmentProfile = {
  target_segment: "enterprise" | "mid_market" | "smb" | "mixed" | "unknown";
  ruleId: string;
  evidence: BaselineEvidence[];
};

export type OfferingProfile = {
  core_offerings: string[];
  offering_count: number;
  offering_complexity_level: "single-offering" | "multi-service" | "broad-portfolio" | "unknown";
  ruleId: string;
  evidence: BaselineEvidence[];
};

export type ValuePropProfile = {
  value_prop_type:
    | "outcome-driven"
    | "efficiency"
    | "risk-compliance"
    | "innovation"
    | "cost-optimization"
    | "other"
    | "unknown";
  dominant_narrative: string | null;
  ruleId: string;
  evidence: BaselineEvidence[];
};

export type TrustIndicators = {
  case_studies_present: boolean;
  certifications_detected: string[];
  logo_grid_detected: boolean;
  testimonial_count: number;
};

export type TrustProfile = {
  trust_indicators: TrustIndicators;
  ruleId: string;
  evidence: BaselineEvidence[];
};

export type CompanyBaselineProfile = {
  about: AboutSnapshot;
  industry_profile: IndustryProfile;
  target_segment_profile: TargetSegmentProfile;
  offering_profile: OfferingProfile;
  value_prop_profile: ValuePropProfile;
  trust_profile: TrustProfile;
  biography_summary: string;
  industry_summary: string;
  target_market_summary: string;
  offering_structure_summary: string;
  value_proposition_summary: string;
  trust_profile_summary: string;
};

