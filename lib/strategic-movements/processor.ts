import { SupabaseClient } from "@supabase/supabase-js";

export type MovementCategory =
    | "Pricing Movement"
    | "Content Expansion"
    | "Compliance Update"
    | "Conversion Optimization"
    | "Positioning Adjustment";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

const STRATEGIC_MAP: Record<MovementCategory, { interpretation: string; action: string }> = {
    "Pricing Movement": {
        interpretation: "Competitor may be refining monetization strategy.",
        action: "Review pricing tiers and CTA alignment."
    },
    "Conversion Optimization": {
        interpretation: "Likely testing conversion language or sales motion.",
        action: "Compare conversion language with your funnel."
    },
    "Content Expansion": {
        interpretation: "Indicates SEO or thought leadership investment.",
        action: "Evaluate topic clusters for SEO competition."
    },
    "Compliance Update": {
        interpretation: "Low strategic significance unless policy scope changed.",
        action: "No immediate action required."
    },
    "Positioning Adjustment": {
        interpretation: "Refining value proposition or target audience messaging.",
        action: "Assess how this matches your current positioning."
    }
};

export function classifyMovement(pageUrl: string, changes: any[]): MovementCategory {
    const urlLower = pageUrl.toLowerCase();

    if (urlLower.includes("pricing")) return "Pricing Movement";
    if (urlLower.includes("blog") || urlLower.includes("news") || urlLower.includes("insight")) return "Content Expansion";
    if (urlLower.includes("privacy") || urlLower.includes("terms") || urlLower.includes("legal")) return "Compliance Update";

    const hasCtaChange = changes.some(c => c.change_type === "cta_text_change" || c.change_type === "cta_change");
    if (hasCtaChange) return "Conversion Optimization";

    return "Positioning Adjustment";
}

export function calculateImpact(pageUrl: string, category: MovementCategory): ImpactLevel {
    const urlLower = pageUrl.toLowerCase();

    // High impact pages/categories
    if (urlLower.includes("pricing") || category === "Pricing Movement") return "HIGH";

    const isHomepage = urlLower.replace(/\/$/, "").split("/").length <= 3; // basic domain-only or domain/ check
    if (isHomepage) return "HIGH";

    if (urlLower.includes("services") || urlLower.includes("product") || urlLower.includes("feature")) return "HIGH";

    // Medium
    if (urlLower.includes("blog") || urlLower.includes("news") || category === "Content Expansion") return "MEDIUM";

    // Low
    if (urlLower.includes("privacy") || urlLower.includes("terms") || urlLower.includes("legal") || category === "Compliance Update") return "LOW";

    return "MEDIUM";
}

export async function processMovementsForJob(supabase: SupabaseClient, jobId: string) {
    console.log(`[StrategicMovements] Processing movements for job ${jobId}...`);

    // 1. Fetch all snapshots for this job to get their IDs
    const { data: snapshots, error: snapshotsError } = await supabase
        .from("snapshots")
        .select("id")
        .eq("crawl_job_id", jobId);

    if (snapshotsError || !snapshots || snapshots.length === 0) {
        console.log(`[StrategicMovements] No snapshots found for job ${jobId}.`);
        return;
    }

    const snapshotIds = snapshots.map(s => s.id);

    // 2. Fetch all changes that link to these "after" snapshots
    const { data: changesByJob, error: jobError } = await supabase
        .from("changes")
        .select(`
      *,
      after_snapshot:snapshots!after_snapshot_id(page_type)
    `)
        .in("after_snapshot_id", snapshotIds);

    if (jobError) {
        console.error("[StrategicMovements] Error fetching changes:", jobError);
        return;
    }

    if (!changesByJob || changesByJob.length === 0) {
        console.log("[StrategicMovements] No changes found for this job.");
        return;
    }

    // 2. Group changes by page_url
    const groupedByPage: Record<string, any[]> = {};
    for (const change of changesByJob) {
        const url = change.page_url;
        if (!groupedByPage[url]) groupedByPage[url] = [];
        groupedByPage[url].push(change);
    }

    // 3. Create movements
    for (const [url, changes] of Object.entries(groupedByPage)) {
        const firstChange = changes[0];
        const competitorId = firstChange.competitor_id;
        const pageType = firstChange.after_snapshot?.page_type || firstChange.page_type;

        const category = classifyMovement(url, changes);
        const impact = calculateImpact(url, category);
        const details = STRATEGIC_MAP[category];

        // Summary generation: concise description of changes
        const changeTypes = Array.from(new Set(changes.map(c => c.change_type)));
        const summary = `Detected ${changes.length} changes (${changeTypes.join(", ")}) on ${url}.`;

        const movement = {
            competitor_id: competitorId,
            page_url: url,
            page_type: pageType,
            change_cluster_count: changes.length,
            movement_category: category,
            impact_level: impact,
            summary: summary,
            interpretation: details.interpretation,
            suggested_action: details.action,
            crawl_job_id: jobId
        };

        const { error: insertError } = await supabase
            .from("strategic_movements")
            .insert(movement);

        if (insertError) {
            console.error(`[StrategicMovements] Error saving movement for ${url}:`, insertError);
        } else {
            console.log(`[StrategicMovements] Saved ${impact} impact movement: ${category} for ${url}`);
        }
    }
}
