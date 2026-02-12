"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId, triggerCrawlNow } from "./competitors/actions";
import { revalidatePath } from "next/cache";

export async function triggerAllCrawls() {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) return { ok: false, error: "Not authenticated" };

    const supabase = await createClient();
    const { data: competitors } = await supabase
        .from("competitors")
        .select("id")
        .eq("workspace_id", workspaceId);

    if (!competitors || competitors.length === 0) {
        return { ok: false, error: "No competitors found" };
    }

    // Trigger explicitly for each (could be optimized but good enough)
    const results = await Promise.all(competitors.map(c => triggerCrawlNow(c.id)));

    const failed = results.filter(r => !r.ok);

    revalidatePath("/dashboard");

    if (failed.length > 0) {
        return { ok: true, message: `Triggered ${results.length - failed.length} crawls. ${failed.length} failed.` };
    }

    return { ok: true, message: `Triggered ${results.length} crawls.` };
}
