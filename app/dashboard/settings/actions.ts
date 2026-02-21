"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface NotificationSettings {
    id?: string;
    workspace_id: string;
    email_enabled: boolean;
    email_address: string | null;
    slack_enabled: boolean;
    slack_webhook_url: string | null;
    notify_on: string[];
}

export async function getNotificationSettings(
    workspaceId: string
): Promise<NotificationSettings | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (error) {
        console.error("[settings] Error fetching notification settings:", error.message);
        return null;
    }
    return data as NotificationSettings | null;
}

export async function saveNotificationSettings(data: {
    workspaceId: string;
    emailEnabled: boolean;
    emailAddress: string;
    slackEnabled: boolean;
    slackWebhookUrl: string;
    notifyOn: string[];
}): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient();

    const payload = {
        workspace_id: data.workspaceId,
        email_enabled: data.emailEnabled,
        email_address: data.emailAddress || null,
        slack_enabled: data.slackEnabled,
        slack_webhook_url: data.slackWebhookUrl || null,
        notify_on: data.notifyOn,
        updated_at: new Date().toISOString(),
    };

    // Upsert: insert or update based on workspace_id uniqueness
    const { error } = await supabase
        .from("notification_settings")
        .upsert(payload, { onConflict: "workspace_id" });

    if (error) {
        console.error("[settings] Error saving notification settings:", error.message);
        return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/settings");
    return { ok: true };
}

export async function sendTestEmail(
    email: string
): Promise<{ ok: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        return {
            ok: false,
            error:
                "RESEND_API_KEY not configured. Add it to your environment variables on Vercel.",
        };
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Insight Compass <onboarding@resend.dev>",
                to: [email],
                subject: "🔔 Insight Compass — Test Notification",
                html: `
          <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; color: #e2e8f0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; padding: 10px 14px; background: rgba(56,189,248,0.15); border-radius: 10px; margin-bottom: 12px;">
                <span style="font-size: 28px;">🧭</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #f1f5f9;">Insight Compass</h1>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 8px; font-size: 18px; color: #38bdf8;">✅ Test Successful!</h2>
              <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Email notifications are working. You will receive alerts here when competitors make strategic changes.
              </p>
            </div>
            <p style="text-align: center; color: #64748b; font-size: 12px; margin: 0;">
              Sent from Insight Compass • Competitor Intelligence Platform
            </p>
          </div>
        `,
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            return { ok: false, error: `Resend API error: ${body}` };
        }

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Failed to send email",
        };
    }
}

export async function sendTestSlack(
    webhookUrl: string
): Promise<{ ok: boolean; error?: string }> {
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
        return {
            ok: false,
            error: "Please enter a valid Slack Incoming Webhook URL",
        };
    }

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🧭 Insight Compass — Test Notification",
                            emoji: true,
                        },
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "✅ *Slack integration is working!*\n\nYou will receive competitor intelligence alerts in this channel when strategic changes are detected.",
                        },
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `Sent at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>`,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            return { ok: false, error: `Slack API error: ${body}` };
        }

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Failed to send Slack message",
        };
    }
}
