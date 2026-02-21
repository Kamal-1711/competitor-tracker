/**
 * Crawl ALL competitors. Run after deploying serverless crawler.
 * Usage: npx tsx scripts/crawl-all.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
}

import { runServerlessCrawl } from "../lib/serverless-crawl";
import { createClient } from "@supabase/supabase-js";

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );

    // Get all competitors
    const { data: competitors, error } = await supabase
        .from("competitors")
        .select("id, name, url")
        .order("created_at", { ascending: true });

    if (error || !competitors) {
        console.error("Failed to fetch competitors:", error?.message);
        process.exit(1);
    }

    console.log(`Found ${competitors.length} competitors to crawl\n`);

    for (const comp of competitors) {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`Crawling: ${comp.name} (${comp.url})`);
        console.log(`${"=".repeat(60)}`);

        // Create a crawl job
        const { data: job, error: jobErr } = await supabase
            .from("crawl_jobs")
            .insert({
                competitor_id: comp.id,
                status: "pending",
                source: "manual-batch",
            })
            .select("id")
            .single();

        if (jobErr || !job) {
            console.error(`  ✗ Failed to create job: ${jobErr?.message}`);
            continue;
        }

        const result = await runServerlessCrawl({
            jobId: job.id,
            competitorId: comp.id,
            competitorUrl: comp.url,
        });

        if (result.ok) {
            console.log(`  ✓ SUCCESS: ${result.pages} pages crawled`);
        } else {
            console.log(`  ✗ FAILED: ${result.errors.join(", ")}`);
        }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("All done!");

    // Show final status
    const { data: jobs } = await supabase
        .from("crawl_jobs")
        .select("id, competitor_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

    console.log("\nLatest crawl jobs:");
    for (const j of jobs || []) {
        console.log(`  ${j.status.padEnd(10)} ${j.competitor_id} (${j.created_at})`);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
