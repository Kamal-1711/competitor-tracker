import type { AboutSnapshot, BaselineEvidence, TargetSegmentProfile } from "./types";
import type { SnapshotSignal } from "@/lib/intelligence-engine";

type TextSources = {
  about: AboutSnapshot;
  homepage: SnapshotSignal | null;
  services: SnapshotSignal | null;
};

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

export function detectTargetSegment(sources: TextSources): TargetSegmentProfile {
  const evidence: BaselineEvidence[] = [];
  const textParts: string[] = [];

  if (sources.about.company_summary_raw) {
    textParts.push(sources.about.company_summary_raw);
    evidence.push({
      source: "about",
      key: "company_summary_raw",
      value: sources.about.company_summary_raw,
    });
  }
  if (sources.homepage?.h1_text) {
    textParts.push(sources.homepage.h1_text);
    evidence.push({ source: "homepage", key: "h1_text", value: sources.homepage.h1_text });
  }
  if (sources.services?.h2_headings?.length) {
    textParts.push(sources.services.h2_headings.join(" "));
    evidence.push({
      source: "services",
      key: "h2_headings",
      value: sources.services.h2_headings.slice(0, 5),
    });
  }

  const combined = normalize(textParts.join(" ").replace(/\s+/g, " ").trim());

  const scores = {
    enterprise: 0,
    mid_market: 0,
    smb: 0,
  };

  const bumpIf = (cond: boolean, key: keyof typeof scores, phrase: string) => {
    if (cond) {
      scores[key] += 1;
      evidence.push({
        source: "about",
        key: `segment_${key}`,
        value: phrase,
      });
    }
  };

  bumpIf(/\benterprise\b/.test(combined), "enterprise", "enterprise");
  bumpIf(/\bmid-?market\b/.test(combined), "mid_market", "mid-market");
  bumpIf(/\bmid sized\b/.test(combined), "mid_market", "mid sized");
  bumpIf(/\bsmb\b/.test(combined), "smb", "SMB");
  bumpIf(/\bsmall business\b/.test(combined), "smb", "small business");
  bumpIf(/\bstartups?\b/.test(combined), "smb", "startup");

  let target_segment: TargetSegmentProfile["target_segment"] = "unknown";

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = sorted[0];
  const [, secondScore] = sorted[1];

  if (topScore === 0) {
    target_segment = "unknown";
  } else if (sorted.filter(([, s]) => s > 0).length > 1 && topScore === secondScore) {
    target_segment = "mixed";
  } else {
    if (topKey === "enterprise") target_segment = "enterprise";
    else if (topKey === "mid_market") target_segment = "mid_market";
    else if (topKey === "smb") target_segment = "smb";
  }

  evidence.push({
    source: "snapshot",
    key: "segment_scores",
    value: scores,
  });

  return {
    target_segment,
    ruleId: "BP-SEG-001",
    evidence,
  };
}

