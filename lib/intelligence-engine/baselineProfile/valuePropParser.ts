import type { AboutSnapshot, BaselineEvidence, ValuePropProfile } from "./types";
import type { SnapshotSignal } from "@/lib/intelligence-engine";

const VALUE_PROP_THEMES: Array<{
  id: ValuePropProfile["value_prop_type"];
  keywords: string[];
  label: string;
}> = [
  {
    id: "outcome-driven",
    keywords: ["outcomes", "business impact", "results", "measurable", "value"],
    label: "Outcome-driven transformation narrative",
  },
  {
    id: "efficiency",
    keywords: ["productivity", "efficiency", "faster", "streamline", "optimize"],
    label: "Efficiency and productivity improvement narrative",
  },
  {
    id: "risk-compliance",
    keywords: ["compliance", "risk", "security", "governance"],
    label: "Risk and compliance-focused narrative",
  },
  {
    id: "innovation",
    keywords: ["innovation", "innovate", "next generation", "reinvent"],
    label: "Innovation and future-oriented narrative",
  },
  {
    id: "cost-optimization",
    keywords: ["lower costs", "cost savings", "save costs", "total cost of ownership"],
    label: "Cost optimization narrative",
  },
];

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

function countKeywords(text: string, keywords: string[]): number {
  let score = 0;
  for (const k of keywords) {
    if (!k) continue;
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "gi");
    const matches = text.match(re);
    if (matches) score += matches.length;
  }
  return score;
}

export function parseValueProp(params: {
  about: AboutSnapshot;
  homepage: SnapshotSignal | null;
}): ValuePropProfile {
  const evidence: BaselineEvidence[] = [];
  const textParts: string[] = [];

  if (params.homepage?.h1_text) {
    textParts.push(params.homepage.h1_text);
    evidence.push({ source: "homepage", key: "h1_text", value: params.homepage.h1_text });
  }
  if (params.homepage?.h2_headings?.length) {
    textParts.push(params.homepage.h2_headings.join(" "));
    evidence.push({
      source: "homepage",
      key: "h2_headings",
      value: params.homepage.h2_headings.slice(0, 5),
    });
  }
  if (params.about.company_summary_raw) {
    textParts.push(params.about.company_summary_raw);
    evidence.push({
      source: "about",
      key: "company_summary_raw",
      value: params.about.company_summary_raw,
    });
  }

  const combined = normalize(textParts.join(" ").replace(/\s+/g, " ").trim());

  let bestTheme: ValuePropProfile["value_prop_type"] = "unknown";
  let bestScore = 0;

  for (const theme of VALUE_PROP_THEMES) {
    const score = countKeywords(combined, theme.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme.id;
    }
  }

  let dominant_narrative: string | null = null;
  if (bestTheme !== "unknown") {
    const themeMeta = VALUE_PROP_THEMES.find((t) => t.id === bestTheme);
    dominant_narrative = themeMeta?.label ?? null;
  }

  evidence.push({
    source: "snapshot",
    key: "value_prop_scores",
    value: VALUE_PROP_THEMES.map((t) => ({
      id: t.id,
      score: countKeywords(combined, t.keywords),
    })),
  });

  return {
    value_prop_type: bestTheme,
    dominant_narrative,
    ruleId: "BP-VP-001",
    evidence,
  };
}

