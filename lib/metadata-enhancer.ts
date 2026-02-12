import type { SupabaseClient } from "@supabase/supabase-js";
import ogs from "open-graph-scraper";

export async function fetchMetadata(url: string) {
    try {
        const { result } = await ogs({ url });

        let logo = result.favicon;
        const ogImage = result.ogImage;

        // heuristic: prefer og:image if it looks like a logo or icon, but usually og:image is a banner.
        // For logo, we might want to check for 'logo' in the url or just stick to favicon. 
        // Better: look for <link rel="icon"> which ogs provides as favicon.

        let title = result.ogTitle || result.requestUrl;

        // clean title: remove " - Home", " | Brand"
        if (title) {
            title = title.split(/ [-|] /)[0];
        }

        return {
            title: title || null,
            description: result.ogDescription || null,
            logo: logo && !logo.startsWith("http") ? new URL(logo, url).toString() : logo
        };
    } catch (e) {
        console.error("Metadata fetch error:", e);
        return null;
    }
}

export async function enhanceCompetitorMetadata(competitorId: string, url: string, supabase: SupabaseClient) {
    const metadata = await fetchMetadata(url);
    if (metadata) {
        const updates: any = {};
        if (metadata.title) updates.name = metadata.title;
        if (metadata.title) updates.name = metadata.title;
        if (metadata.logo) updates.logo_url = metadata.logo;

        await supabase.from("competitors").update(updates).eq("id", competitorId);
    }
}
