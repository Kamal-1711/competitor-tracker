import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedInsight } from "./generateInsights";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function filterRecentDuplicates(
  supabase: SupabaseClient,
  insight: GeneratedInsight
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("insights")
    .select("id")
    .eq("competitor_id", insight.competitor_id)
    .eq("page_type", insight.page_type)
    .eq("insight_type", insight.insight_type)
    .eq("insight_text", insight.insight_text)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export async function persistInsights(insights: GeneratedInsight[]): Promise<void> {
  if (insights.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const rows: GeneratedInsight[] = [];

  for (const insight of insights) {
    const isDuplicate = await filterRecentDuplicates(supabase, insight);
    if (!isDuplicate) rows.push(insight);
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("insights").insert(rows);
  if (error) {
    throw new Error(`Failed to persist insights: ${error.message}`);
  }
}
