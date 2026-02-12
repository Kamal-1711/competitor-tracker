import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { BlogFeed } from "./blog-feed";

export const dynamic = "force-dynamic";

export default async function BlogIntelligencePage() {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) return <div className="p-8">Please sign in.</div>;

    const supabase = await createClient();

    // Fetch competitors for filter
    const { data: competitors } = await supabase
        .from("competitors")
        .select("id, name, url, logo_url")
        .eq("workspace_id", workspaceId)
        .order("name");

    // Fetch initial blog posts
    const { data: posts } = await supabase
        .from("blog_posts")
        .select("*")
        // Filter by competitors in workspace?
        // blog_posts -> competitor_id.
        // We need to join or filter by competitor_id list.
        .in("competitor_id", (competitors || []).map(c => c.id))
        .order("publish_date", { ascending: false, nullsFirst: false })
        .order("first_detected_at", { ascending: false })
        .limit(100);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Blog Intelligence
                </h1>
                <p className="text-sm text-muted-foreground">
                    Track competitor publishing activity and content themes.
                </p>
            </div>

            <BlogFeed
                initialPosts={posts || []}
                competitors={competitors || []}
            />
        </div>
    );
}
