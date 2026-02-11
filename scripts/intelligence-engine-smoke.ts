/**
 * Smoke test for determinism + traceability.
 * Run: npx tsx scripts/intelligence-engine-smoke.ts
 */
import { buildRawSignals, runIntelligenceEngine, type RawSignalsInput } from "@/lib/intelligence-engine";
import { PAGE_TAXONOMY } from "@/lib/PAGE_TAXONOMY";

const input: RawSignalsInput = {
  competitorId: "demo-competitor",
  trackedPageTypes: [PAGE_TAXONOMY.HOMEPAGE, PAGE_TAXONOMY.PRICING, PAGE_TAXONOMY.SERVICES],
  changesLast30dCount: 3,
  latestByPageType: {
    homepage: { h1_text: "Make better decisions, faster" },
    pricing: { h1_text: "Pricing", h2_headings: ["Enterprise", "Custom"] },
    services: {
      http_status: 200,
      title: "Services",
      h2_headings: ["Implementation", "Integrations", "Advisory"],
      structured_content: {
        strategic_keywords_count: 3,
        execution_keywords_count: 2,
        lifecycle_keywords_count: 1,
        enterprise_keywords_count: 2,
        industries: ["Fintech", "SaaS"],
        primary_focus: "Balanced",
        section_count: 9,
      },
    },
  },
  webpageSignalInsights: [
    {
      page_type: PAGE_TAXONOMY.HOMEPAGE,
      insight_type: "webpage_signal",
      insight_text: "Homepage messaging emphasizes productivity.",
    },
    {
      page_type: PAGE_TAXONOMY.HOMEPAGE,
      insight_type: "webpage_signal",
      insight_text: "Primary CTA suggests a hybrid go-to-market strategy.",
    },
    {
      page_type: PAGE_TAXONOMY.PRICING,
      insight_type: "webpage_signal",
      insight_text: "Enterprise positioning emphasized.",
    },
  ],
};

function stableJson(obj: unknown): string {
  return JSON.stringify(obj);
}

async function main() {
  const raw = buildRawSignals(input);
  const a = runIntelligenceEngine(raw);
  const b = runIntelligenceEngine(raw);

  const aJson = stableJson(a);
  const bJson = stableJson(b);

  if (aJson !== bJson) {
    throw new Error("Determinism check failed: outputs differ for identical inputs.");
  }

  // Minimal traceability checks
  if (!a.trace.length) throw new Error("Traceability check failed: trace is empty.");
  const hasRuleIds = a.trace.every((t) => Boolean(t.ruleId));
  if (!hasRuleIds) throw new Error("Traceability check failed: missing ruleId in trace.");

  console.log("Determinism: OK");
  console.log("Traceability: OK");
  console.log("Confidence:", a.confidence.level);
  console.log(
    "Top strengths:",
    a.narrative.strengths.map((s) => s.text).join(" | ")
  );
  console.log(
    "Top risks:",
    a.narrative.risks.map((r) => r.text).join(" | ")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

