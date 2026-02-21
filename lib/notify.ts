/**
 * Notification dispatcher — sends alerts after a crawl completes.
 * Called from runServerlessCrawl() in lib/serverless-crawl.ts.
 */

import { createClient } from "@supabase/supabase-js";

function createSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

interface NotifyParams {
    workspaceId: string;
    competitorName: string;
    competitorUrl: string;
    pagesCount: number;
    crawlJobId: string;
}

export async function dispatchNotifications(params: NotifyParams) {
    const { workspaceId, competitorName, competitorUrl, pagesCount, crawlJobId } =
        params;

    const supabase = createSupabaseAdmin();

    // Fetch notification settings for this workspace
    const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (!settings) return;

    const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
    });

    // Email notification
    if (settings.email_enabled && settings.email_address) {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
            try {
                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "Insight Compass <onboarding@resend.dev>",
                        to: [settings.email_address],
                        subject: `🔔 ${competitorName} — Crawl Completed (${pagesCount} pages)`,
                        html: `
              <div style="font-family:'Inter',-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px;color:#e2e8f0;">
                <div style="text-align:center;margin-bottom:24px;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">🧭 Insight Compass</h1>
                </div>
                <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:16px;">
                  <h2 style="margin:0 0 12px;font-size:18px;color:#38bdf8;">Crawl Complete</h2>
                  <table style="width:100%;color:#94a3b8;font-size:14px;">
                    <tr><td style="padding:4px 0;color:#64748b;">Competitor</td><td style="padding:4px 0;font-weight:600;color:#f1f5f9;">${competitorName}</td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">URL</td><td style="padding:4px 0;"><a href="${competitorUrl}" style="color:#38bdf8;">${competitorUrl}</a></td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">Pages Crawled</td><td style="padding:4px 0;font-weight:600;color:#f1f5f9;">${pagesCount}</td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">Completed</td><td style="padding:4px 0;">${now}</td></tr>
                  </table>
                </div>
                <p style="text-align:center;color:#64748b;font-size:12px;margin:0;">Insight Compass • Competitor Intelligence</p>
              </div>
            `,
                    }),
                });
            } catch (err) {
                console.warn("[notify] Email send error:", err);
            }
        }
    }

    // Slack notification
    if (settings.slack_enabled && settings.slack_webhook_url) {
        try {
            await fetch(settings.slack_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `🧭 ${competitorName} — Crawl Completed`,
                                emoji: true,
                            },
                        },
                        {
                            type: "section",
                            fields: [
                                { type: "mrkdwn", text: `*Competitor:*\n${competitorName}` },
                                { type: "mrkdwn", text: `*Pages Crawled:*\n${pagesCount}` },
                                { type: "mrkdwn", text: `*URL:*\n<${competitorUrl}|${competitorUrl}>` },
                                { type: "mrkdwn", text: `*Completed:*\n${now}` },
                            ],
                        },
                        {
                            type: "context",
                            elements: [
                                { type: "mrkdwn", text: `Job ID: \`${crawlJobId}\`` },
                            ],
                        },
                    ],
                }),
            });
        } catch (err) {
            console.warn("[notify] Slack send error:", err);
        }
    }
}
