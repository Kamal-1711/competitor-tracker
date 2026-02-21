/**
 * Quick test: run the serverless crawl locally for one competitor.
 * Usage: npx tsx scripts/test-crawl.ts
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

// Use Groww as a test
const COMPETITOR_ID = "767d6e51-1aed-46ce-9dd7-8d0d0f591ce6";
const COMPETITOR_URL = "https://groww.in";

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );

    // Create a test job
    const { data: job, error: jobErr } = await supabase
        .from("crawl_jobs")
        .insert({
            competitor_id: COMPETITOR_ID,
            status: "pending",
            source: "test",
        })
        .select("id")
        .single();

    if (jobErr || !job) {
        console.error("Failed to create test job:", jobErr?.message);
        process.exit(1);
    }

    console.log(`Created test job: ${job.id}`);
    console.log(`Starting serverless crawl for ${COMPETITOR_URL}...`);
    console.log("---");

    const result = await runServerlessCrawl({
        jobId: job.id,
        competitorId: COMPETITOR_ID,
        competitorUrl: COMPETITOR_URL,
    });

    console.log("---");
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
