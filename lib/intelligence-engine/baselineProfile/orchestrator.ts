import type { SnapshotSignal } from "@/lib/intelligence-engine";
import { extractAboutSnapshot } from "./aboutExtractor";
import { classifyIndustry } from "./industryClassifier";
import { detectTargetSegment } from "./targetSegmentDetector";
import { analyzeOfferings } from "./offeringAnalyzer";
import { parseValueProp } from "./valuePropParser";
import { extractTrustProfile } from "./trustSignalExtractor";
import { composeBaseline } from "./baselineComposer";
import type { CompanyBaselineProfile } from "./types";

export type BaselineInput = {
  competitorId: string;
  homepage: SnapshotSignal | null;
  aboutLikePage: SnapshotSignal | null;
  servicesPage: SnapshotSignal | null;
  navSnapshot: SnapshotSignal | null;
  caseStudiesPage: SnapshotSignal | null;
};

export type BaselineTraceEvent = {
  step:
    | "about"
    | "industry"
    | "segment"
    | "offerings"
    | "valueProp"
    | "trust"
    | "compose";
  ruleId: string;
  message: string;
  data?: unknown;
};

export type BaselineResult = {
  profile: CompanyBaselineProfile;
  trace: BaselineTraceEvent[];
};

export function runBaselineProfile(input: BaselineInput): BaselineResult {
  const trace: BaselineTraceEvent[] = [];

  const about = extractAboutSnapshot({
    homepage: input.homepage,
    aboutLikePage: input.aboutLikePage,
  });
  trace.push({
    step: "about",
    ruleId: about.ruleId,
    message: "Extracted about/company snapshot.",
    data: {
      hasSummary: Boolean(about.company_summary_raw),
      founding_year: about.founding_year,
      regions: about.detected_regions,
    },
  });

  const industry = classifyIndustry({
    about,
    homepage: input.homepage,
    services: input.servicesPage,
  });
  trace.push({
    step: "industry",
    ruleId: industry.ruleId,
    message: "Classified primary and secondary industries.",
    data: {
      primary_industry: industry.primary_industry,
      secondary_industries: industry.secondary_industries,
      confidence: industry.industry_confidence,
    },
  });

  const segment = detectTargetSegment({
    about,
    homepage: input.homepage,
    services: input.servicesPage,
  });
  trace.push({
    step: "segment",
    ruleId: segment.ruleId,
    message: "Detected target segment profile.",
    data: { target_segment: segment.target_segment },
  });

  const offerings = analyzeOfferings({
    servicesSnapshot: input.servicesPage,
    navSnapshot: input.navSnapshot,
  });
  trace.push({
    step: "offerings",
    ruleId: offerings.ruleId,
    message: "Analyzed core offerings and complexity.",
    data: {
      offering_count: offerings.offering_count,
      complexity: offerings.offering_complexity_level,
    },
  });

  const valueProp = parseValueProp({
    about,
    homepage: input.homepage,
  });
  trace.push({
    step: "valueProp",
    ruleId: valueProp.ruleId,
    message: "Parsed value proposition theme and narrative.",
    data: {
      type: valueProp.value_prop_type,
      dominant_narrative: valueProp.dominant_narrative,
    },
  });

  const trust = extractTrustProfile({
    homepage: input.homepage,
    caseStudiesPage: input.caseStudiesPage,
  });
  trace.push({
    step: "trust",
    ruleId: trust.ruleId,
    message: "Extracted trust indicators.",
    data: trust.trust_indicators,
  });

  const profile = composeBaseline({
    competitorId: input.competitorId,
    about,
    industry,
    segment,
    offerings,
    valueProp,
    trust,
  });
  trace.push({
    step: "compose",
    ruleId: "BP-COMP-001",
    message: "Composed company baseline profile and summaries.",
    data: {
      hasBiography: Boolean(profile.biography_summary),
      hasOfferings: profile.offering_profile.offering_count > 0,
    },
  });

  return { profile, trace };
}

