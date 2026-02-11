import type { BaselineEvidence, TrustIndicators, TrustProfile } from "./types";
import type { SnapshotSignal } from "@/lib/intelligence-engine";

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

function detectCertifications(text: string): string[] {
  const hits: string[] = [];
  if (/iso\s*27\d{2}/i.test(text)) hits.push("ISO 27k");
  if (/soc\s*2/i.test(text)) hits.push("SOC 2");
  if (/hipaa/i.test(text)) hits.push("HIPAA");
  if (/gdpr/i.test(text)) hits.push("GDPR");
  return Array.from(new Set(hits));
}

function detectLogoGrid(text: string): boolean {
  return /trusted by/i.test(text) || /customers include/i.test(text);
}

export function extractTrustProfile(params: {
  homepage: SnapshotSignal | null;
  caseStudiesPage: SnapshotSignal | null;
}): TrustProfile {
  const evidence: BaselineEvidence[] = [];

  const homepageText = [
    params.homepage?.h1_text,
    ...(params.homepage?.h2_headings ?? []),
    ...(params.homepage?.list_items ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  const caseStudiesText = [
    params.caseStudiesPage?.h1_text,
    ...(params.caseStudiesPage?.h2_headings ?? []),
    ...(params.caseStudiesPage?.list_items ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  const combinedHomepage = normalize(homepageText);
  const combinedCases = normalize(caseStudiesText);

  const case_studies_present =
    Boolean(params.caseStudiesPage) ||
    /case stud(y|ies)|customer story|success story/i.test(combinedHomepage) ||
    /case stud(y|ies)|customer story|success story/i.test(combinedCases);

  if (case_studies_present) {
    evidence.push({
      source: params.caseStudiesPage ? "case_studies" : "homepage",
      key: "case_studies_present",
      value: true,
    });
  }

  const certifications_detected = Array.from(
    new Set([
      ...detectCertifications(combinedHomepage),
      ...detectCertifications(combinedCases),
    ]),
  );
  if (certifications_detected.length) {
    evidence.push({
      source: "snapshot",
      key: "certifications",
      value: certifications_detected,
    });
  }

  const logo_grid_detected =
    detectLogoGrid(combinedHomepage) || detectLogoGrid(combinedCases);
  if (logo_grid_detected) {
    evidence.push({
      source: "homepage",
      key: "logo_grid_detected",
      value: true,
    });
  }

  const testimonialMatches = [...(homepageText.match(/“[^”]+”|"[^"]+"/g) ?? [])];
  const testimonial_count = testimonialMatches.length;
  if (testimonial_count > 0) {
    evidence.push({
      source: "homepage",
      key: "testimonial_snippets",
      value: testimonialMatches.slice(0, 5),
    });
  }

  const trust_indicators: TrustIndicators = {
    case_studies_present,
    certifications_detected,
    logo_grid_detected,
    testimonial_count,
  };

  return {
    trust_indicators,
    ruleId: "BP-TRUST-001",
    evidence,
  };
}

