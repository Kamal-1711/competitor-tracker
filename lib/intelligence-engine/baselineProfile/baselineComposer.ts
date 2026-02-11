import crypto from "node:crypto";
import type {
  AboutSnapshot,
  CompanyBaselineProfile,
  IndustryProfile,
  OfferingProfile,
  TargetSegmentProfile,
  TrustProfile,
  ValuePropProfile,
} from "./types";

function hashIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  const n = parseInt(hex, 16);
  return n % modulo;
}

export function composeBaseline(params: {
  competitorId: string;
  about: AboutSnapshot;
  industry: IndustryProfile;
  segment: TargetSegmentProfile;
  offerings: OfferingProfile;
  valueProp: ValuePropProfile;
  trust: TrustProfile;
}): CompanyBaselineProfile {
  const { competitorId, about, industry, segment, offerings, valueProp, trust } = params;

  const foundedPart =
    about.founding_year != null ? `Founded: ${about.founding_year}` : "Founded year: Not explicitly stated";
  const regionsPart =
    about.detected_regions.length > 0
      ? `Regions Mentioned: ${about.detected_regions.join(", ")}`
      : "Regions Mentioned: Not clearly specified";

  const primaryIndustryLabel = industry.primary_industry ?? "Not clearly specified";
  const industryConfidencePart = `(${industry.industry_confidence} confidence)`;

  const industry_profile = industry;

  const biography_summary = [
    `Industry: ${primaryIndustryLabel} ${industry.primary_industry ? industryConfidencePart : ""}`.trim(),
    foundedPart,
    regionsPart,
  ].join("\n");

  const targetSegmentLabelMap: Record<TargetSegmentProfile["target_segment"], string> = {
    enterprise: "Enterprise-focused positioning",
    mid_market: "Mid-market oriented positioning",
    smb: "SMB / small business oriented positioning",
    mixed: "Mixed segment positioning",
    unknown: "Target segment not explicitly signaled yet",
  };
  const target_market_summary = targetSegmentLabelMap[segment.target_segment];

  let offering_structure_summary = "Offering structure not yet clearly surfaced.";
  if (offerings.offering_complexity_level === "single-offering") {
    offering_structure_summary = "Offering Structure: Focused single-offering model.";
  } else if (offerings.offering_complexity_level === "multi-service") {
    offering_structure_summary = "Offering Structure: Multi-service model with a defined set of offerings.";
  } else if (offerings.offering_complexity_level === "broad-portfolio") {
    offering_structure_summary = "Offering Structure: Diversified multi-service portfolio.";
  }

  const valuePropTemplates: string[] =
    valueProp.value_prop_type === "outcome-driven"
      ? ["Outcome-driven transformation narrative."]
      : valueProp.value_prop_type === "efficiency"
      ? ["Efficiency and productivity improvement narrative."]
      : valueProp.value_prop_type === "risk-compliance"
      ? ["Risk and compliance-focused narrative."]
      : valueProp.value_prop_type === "innovation"
      ? ["Innovation and future-oriented narrative."]
      : valueProp.value_prop_type === "cost-optimization"
      ? ["Cost optimization narrative."]
      : ["Value proposition is present but not yet strongly classified."];

  const vpIdx = hashIndex(`${competitorId}:valueProp:${valueProp.ruleId}`, valuePropTemplates.length);
  const value_proposition_summary = valuePropTemplates[vpIdx];

  const trustIndicators = trust.trust_indicators;
  const trustLines: string[] = [];
  if (trustIndicators.case_studies_present) trustLines.push("Case studies present");
  if (trustIndicators.certifications_detected.length)
    trustLines.push(`Certifications detected: ${trustIndicators.certifications_detected.join(", ")}`);
  if (trustIndicators.logo_grid_detected) trustLines.push("Logo grid / \"Trusted by\" section detected");
  if (trustIndicators.testimonial_count > 0)
    trustLines.push(`Testimonials detected (approx. ${trustIndicators.testimonial_count})`);
  if (trustLines.length === 0) {
    trustLines.push("Trust signals will strengthen as more surfaces are crawled.");
  }
  const trust_profile_summary = trustLines.join("\n");

  const industry_summary = `Primary industry: ${primaryIndustryLabel}${
    industry.secondary_industries.length ? `; Secondary: ${industry.secondary_industries.join(", ")}` : ""
  }. Confidence: ${industry.industry_confidence}.`;

  return {
    about,
    industry_profile: industry_profile,
    target_segment_profile: segment,
    offering_profile: offerings,
    value_prop_profile: valueProp,
    trust_profile: trust,
    biography_summary,
    industry_summary,
    target_market_summary,
    offering_structure_summary,
    value_proposition_summary,
    trust_profile_summary,
  };
}

