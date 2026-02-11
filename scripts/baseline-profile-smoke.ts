/**
 * Baseline profile determinism + traceability smoke test.
 * Run: npx tsx scripts/baseline-profile-smoke.ts
 */
import { BaselineProfile, type SnapshotSignal } from "@/lib/intelligence-engine";

const homepage: SnapshotSignal = {
  url: "https://example.com",
  http_status: 200,
  title: "Example Corp",
  h1_text: "Digital transformation for enterprise teams",
  h2_headings: ["Global delivery", "Our mission", "Customer outcomes"],
  h3_headings: ["North America", "Europe"],
  list_items: ["Trusted by leading banks", "ISO 27001 certified"],
  nav_labels: ["Solutions", "Industries", "Case Studies"],
  structured_content: null,
};

const services: SnapshotSignal = {
  url: "https://example.com/services",
  http_status: 200,
  title: "Services",
  h1_text: "Our Services",
  h2_headings: ["Digital Transformation", "Cloud Advisory", "Managed Services"],
  h3_headings: ["Assessment", "Implementation", "Ongoing Optimization"],
  list_items: [],
  nav_labels: [],
  structured_content: {
    strategic_keywords_count: 3,
    execution_keywords_count: 2,
    lifecycle_keywords_count: 1,
    enterprise_keywords_count: 2,
    industries: ["Fintech", "SaaS"],
    primary_focus: "Balanced",
    section_count: 9,
  },
};

const caseStudies: SnapshotSignal = {
  url: "https://example.com/customers",
  http_status: 200,
  title: "Customer Stories",
  h1_text: "Customer Success Stories",
  h2_headings: ["Global bank modernizes core platform"],
  h3_headings: [],
  list_items: ["SOC 2 certified", "Trusted by leading enterprises"],
  nav_labels: [],
  structured_content: null,
};

async function main() {
  const input: BaselineProfile.BaselineInput = {
    competitorId: "demo-baseline",
    homepage,
    aboutLikePage: null,
    servicesPage: services,
    navSnapshot: homepage,
    caseStudiesPage: caseStudies,
  };

  const a = BaselineProfile.runBaselineProfile(input);
  const b = BaselineProfile.runBaselineProfile(input);

  const aJson = JSON.stringify(a);
  const bJson = JSON.stringify(b);

  if (aJson !== bJson) {
    throw new Error("Baseline determinism check failed: outputs differ for identical inputs.");
  }

  if (!a.trace.length) {
    throw new Error("Baseline traceability check failed: trace is empty.");
  }

  console.log("Baseline determinism: OK");
  console.log("Baseline traceability: OK");
  console.log("Biography summary:", a.profile.biography_summary);
  console.log("Offering structure summary:", a.profile.offering_structure_summary);
  console.log("Target market summary:", a.profile.target_market_summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

