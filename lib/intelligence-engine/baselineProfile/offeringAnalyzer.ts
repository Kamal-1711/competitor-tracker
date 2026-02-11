import type { OfferingProfile, BaselineEvidence } from "./types";
import type { SnapshotSignal } from "@/lib/intelligence-engine";

function normalizeHeading(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function analyzeOfferings(params: {
  servicesSnapshot: SnapshotSignal | null;
  navSnapshot: SnapshotSignal | null;
}): OfferingProfile {
  const evidence: BaselineEvidence[] = [];
  const core_offerings: string[] = [];
  const seen = new Set<string>();

  if (params.servicesSnapshot?.h2_headings?.length) {
    for (const h of params.servicesSnapshot.h2_headings) {
      const norm = normalizeHeading(h);
      if (!norm) continue;
      const key = norm.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      core_offerings.push(norm);
    }
    evidence.push({
      source: "services",
      key: "h2_headings",
      value: params.servicesSnapshot.h2_headings.slice(0, 10),
    });
  }

  if (params.servicesSnapshot?.h3_headings?.length) {
    for (const h of params.servicesSnapshot.h3_headings) {
      const norm = normalizeHeading(h);
      if (!norm) continue;
      const key = norm.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      core_offerings.push(norm);
    }
    evidence.push({
      source: "services",
      key: "h3_headings",
      value: params.servicesSnapshot.h3_headings.slice(0, 10),
    });
  }

  if (params.navSnapshot?.nav_labels?.length) {
    for (const label of params.navSnapshot.nav_labels) {
      const norm = normalizeHeading(label);
      if (!norm) continue;
      const key = norm.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      core_offerings.push(norm);
    }
    evidence.push({
      source: "nav",
      key: "nav_labels",
      value: params.navSnapshot.nav_labels.slice(0, 10),
    });
  }

  const offering_count = core_offerings.length;
  const sectionCount =
    typeof (params.servicesSnapshot?.structured_content as any)?.section_count === "number"
      ? Number((params.servicesSnapshot!.structured_content as any).section_count)
      : null;

  let offering_complexity_level: OfferingProfile["offering_complexity_level"] = "unknown";
  if (offering_count <= 1) offering_complexity_level = "single-offering";
  else if (offering_count <= 6) offering_complexity_level = "multi-service";
  else offering_complexity_level = "broad-portfolio";

  evidence.push({
    source: "services",
    key: "section_count",
    value: sectionCount,
  });

  return {
    core_offerings,
    offering_count,
    offering_complexity_level,
    ruleId: "BP-OFF-001",
    evidence,
  };
}

