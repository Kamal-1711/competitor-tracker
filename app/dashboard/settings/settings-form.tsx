"use client";

import { useState, useTransition } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Mail,
    Hash,
    Bell,
    Save,
    CheckCircle2,
    XCircle,
    Loader2,
    Send,
    ExternalLink,
    User,
    Building2,
    LogOut,
    Trash2,
    AlertTriangle,
} from "lucide-react";
import {
    saveNotificationSettings,
    sendTestEmail,
    sendTestSlack,
} from "./actions";

interface SettingsFormProps {
    userEmail: string;
    workspaceId: string;
    initialSettings: {
        email_enabled: boolean;
        email_address: string | null;
        slack_enabled: boolean;
        slack_webhook_url: string | null;
        notify_on: string[];
    } | null;
}

type Tab = "notifications" | "workspace" | "account";

export function SettingsForm({
    userEmail,
    workspaceId,
    initialSettings,
}: SettingsFormProps) {
    const [activeTab, setActiveTab] = useState<Tab>("notifications");
    const [isSaving, startSaveTransition] = useTransition();

    // Form state
    const [emailEnabled, setEmailEnabled] = useState(
        initialSettings?.email_enabled ?? false
    );
    const [emailAddress, setEmailAddress] = useState(
        initialSettings?.email_address ?? userEmail ?? ""
    );
    const [slackEnabled, setSlackEnabled] = useState(
        initialSettings?.slack_enabled ?? false
    );
    const [slackWebhookUrl, setSlackWebhookUrl] = useState(
        initialSettings?.slack_webhook_url ?? ""
    );
    const [notifyOn, setNotifyOn] = useState<string[]>(
        initialSettings?.notify_on ?? ["strategic", "pricing"]
    );

    // Feedback state
    const [saveStatus, setSaveStatus] = useState<
        "idle" | "saved" | "error"
    >("idle");
    const [emailTestStatus, setEmailTestStatus] = useState<
        "idle" | "sending" | "success" | "error"
    >("idle");
    const [emailTestError, setEmailTestError] = useState("");
    const [slackTestStatus, setSlackTestStatus] = useState<
        "idle" | "sending" | "success" | "error"
    >("idle");
    const [slackTestError, setSlackTestError] = useState("");

    function toggleNotifyOn(val: string) {
        setNotifyOn((prev) =>
            prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
        );
    }

    function handleSave() {
        startSaveTransition(async () => {
            const result = await saveNotificationSettings({
                workspaceId,
                emailEnabled,
                emailAddress,
                slackEnabled,
                slackWebhookUrl,
                notifyOn,
            });
            setSaveStatus(result.ok ? "saved" : "error");
            setTimeout(() => setSaveStatus("idle"), 3000);
        });
    }

    async function handleTestEmail() {
        if (!emailAddress) return;
        setEmailTestStatus("sending");
        setEmailTestError("");
        const result = await sendTestEmail(emailAddress);
        if (result.ok) {
            setEmailTestStatus("success");
        } else {
            setEmailTestStatus("error");
            setEmailTestError(result.error ?? "Unknown error");
        }
        setTimeout(() => setEmailTestStatus("idle"), 5000);
    }

    async function handleTestSlack() {
        if (!slackWebhookUrl) return;
        setSlackTestStatus("sending");
        setSlackTestError("");
        const result = await sendTestSlack(slackWebhookUrl);
        if (result.ok) {
            setSlackTestStatus("success");
        } else {
            setSlackTestStatus("error");
            setSlackTestError(result.error ?? "Unknown error");
        }
        setTimeout(() => setSlackTestStatus("idle"), 5000);
    }

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
        { id: "workspace", label: "Workspace", icon: <Building2 className="h-4 w-4" /> },
        { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Manage notifications, workspace, and account preferences.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                ? "bg-background text-foreground shadow-sm border border-border/60"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* === Notifications Tab === */}
            {activeTab === "notifications" && (
                <div className="flex flex-col gap-5 animate-in fade-in-50 duration-300">
                    {/* Email Integration */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Email Notifications</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Receive crawl alerts directly in your inbox
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {emailEnabled && emailAddress ? (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Connected
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                            Not configured
                                        </span>
                                    )}
                                    <Switch
                                        id="email-toggle"
                                        checked={emailEnabled}
                                        onCheckedChange={setEmailEnabled}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        {emailEnabled && (
                            <CardContent className="pt-0 space-y-4 border-t border-border/40 mt-0 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-address" className="text-sm">
                                        Email Address
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="email-address"
                                            type="email"
                                            placeholder="alerts@yourcompany.com"
                                            value={emailAddress}
                                            onChange={(e) => setEmailAddress(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleTestEmail}
                                            disabled={
                                                !emailAddress || emailTestStatus === "sending"
                                            }
                                            className="shrink-0 gap-1.5"
                                        >
                                            {emailTestStatus === "sending" ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : emailTestStatus === "success" ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : emailTestStatus === "error" ? (
                                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                                            ) : (
                                                <Send className="h-3.5 w-3.5" />
                                            )}
                                            {emailTestStatus === "success"
                                                ? "Sent!"
                                                : emailTestStatus === "error"
                                                    ? "Failed"
                                                    : "Test"}
                                        </Button>
                                    </div>
                                    {emailTestStatus === "error" && emailTestError && (
                                        <p className="text-xs text-red-400 mt-1">{emailTestError}</p>
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Slack Integration */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                                        <Hash className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Slack Notifications</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Get alerts posted to a Slack channel
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {slackEnabled && slackWebhookUrl ? (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Connected
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                            Not configured
                                        </span>
                                    )}
                                    <Switch
                                        id="slack-toggle"
                                        checked={slackEnabled}
                                        onCheckedChange={setSlackEnabled}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        {slackEnabled && (
                            <CardContent className="pt-0 space-y-4 border-t border-border/40 mt-0 pt-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="slack-webhook" className="text-sm">
                                            Incoming Webhook URL
                                        </Label>
                                        <a
                                            href="https://api.slack.com/messaging/webhooks"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                                        >
                                            How to get this?
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            id="slack-webhook"
                                            type="url"
                                            placeholder="https://hooks.slack.com/services/..."
                                            value={slackWebhookUrl}
                                            onChange={(e) => setSlackWebhookUrl(e.target.value)}
                                            className="flex-1 font-mono text-xs"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleTestSlack}
                                            disabled={
                                                !slackWebhookUrl || slackTestStatus === "sending"
                                            }
                                            className="shrink-0 gap-1.5"
                                        >
                                            {slackTestStatus === "sending" ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : slackTestStatus === "success" ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : slackTestStatus === "error" ? (
                                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                                            ) : (
                                                <Send className="h-3.5 w-3.5" />
                                            )}
                                            {slackTestStatus === "success"
                                                ? "Sent!"
                                                : slackTestStatus === "error"
                                                    ? "Failed"
                                                    : "Test"}
                                        </Button>
                                    </div>
                                    {slackTestStatus === "error" && slackTestError && (
                                        <p className="text-xs text-red-400 mt-1">{slackTestError}</p>
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Alert Triggers */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Alert Triggers</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Choose which types of changes trigger notifications
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                {
                                    val: "strategic",
                                    label: "Strategic Changes",
                                    desc: "Major positioning, messaging, or navigation shifts",
                                },
                                {
                                    val: "pricing",
                                    label: "Pricing Changes",
                                    desc: "Price updates, new plans, billing model changes",
                                },
                                {
                                    val: "all",
                                    label: "All Changes",
                                    desc: "Every detected change including minor text edits",
                                },
                            ].map((opt) => (
                                <label
                                    key={opt.val}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-border/80 transition-colors cursor-pointer"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{opt.label}</p>
                                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                    </div>
                                    <Switch
                                        checked={notifyOn.includes(opt.val)}
                                        onCheckedChange={() => toggleNotifyOn(opt.val)}
                                    />
                                </label>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Save Button — Sticky */}
                    <div className="sticky bottom-4 z-10">
                        <div className="flex items-center justify-end gap-3 p-3 rounded-xl glass-panel border border-border/60 shadow-lg">
                            {saveStatus === "saved" && (
                                <span className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium animate-in fade-in-50">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Settings saved!
                                </span>
                            )}
                            {saveStatus === "error" && (
                                <span className="flex items-center gap-1.5 text-sm text-red-400 font-medium animate-in fade-in-50">
                                    <XCircle className="h-4 w-4" />
                                    Failed to save
                                </span>
                            )}
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save Settings
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Workspace Tab === */}
            {activeTab === "workspace" && (
                <div className="flex flex-col gap-5 animate-in fade-in-50 duration-300">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Workspace</CardTitle>
                            <CardDescription className="text-xs">
                                Manage your workspace settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="workspace-name">Workspace Name</Label>
                                <Input id="workspace-name" defaultValue="My Workspace" />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4 bg-muted/50 rounded-b-lg">
                            <div className="flex items-center justify-between w-full">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-destructive flex items-center gap-1.5">
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete Workspace
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Permanently delete your workspace and all data.
                                    </p>
                                </div>
                                <Button variant="destructive" size="sm">
                                    Delete
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* === Account Tab === */}
            {activeTab === "account" && (
                <div className="flex flex-col gap-5 animate-in fade-in-50 duration-300">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Account</CardTitle>
                            <CardDescription className="text-xs">
                                Manage your account details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={userEmail} disabled readOnly />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4 bg-muted/50 rounded-b-lg">
                            <form action="/api/auth/logout" method="POST">
                                <Button variant="outline" type="submit" className="gap-2">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
