import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import {
    Brain,
    Sparkles,
    TrendingUp,
    AlertCircle,
    Linkedin,
    Twitter,
    Youtube,
    Zap,
    Target,
    ArrowLeft,
    MessageSquare,
    ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSocialImpactForCompetitor } from "@/lib/social-intelligence/mock-generator";
import { PlatformMetricCard } from "@/components/social/platform-metric-card";

export default async function CompetitorSocialDetailPage({
    params,
}: {
    params: Promise<{ competitorId: string }>;
}) {
    const { competitorId } = await params;
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) return null;

    const supabase = await createClient();
    const { data: competitor } = await supabase
        .from("competitors")
        .select("id, name, url")
        .eq("id", competitorId)
        .eq("workspace_id", workspaceId)
        .single();

    if (!competitor) notFound();

    const impact = getSocialImpactForCompetitor(competitor.id, competitor.name);

    return (
        <div className="space-y-8">
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="rounded-full">
                        <Link href="/dashboard/social-intelligence">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">{competitor.name}</h1>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                Social Blueprint
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                            {competitor.url}
                            <ChevronRight className="h-3 w-3" />
                            Real-time Social Awareness
                        </p>
                    </div>
                </div>
            </div>

            {/* Hero Summary Card */}
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-background to-purple-500/5 overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            AI Intelligence Summary
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-normal">
                            Confidence: {impact.momentumValue > 80 ? "High" : "Medium"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-xl leading-relaxed text-foreground/90 font-medium">
                        {impact.marketSummary}
                    </p>
                </CardContent>
            </Card>

            {/* Narrative Shift Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            Detected Narrative Shift
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Past Themes</p>
                                {impact.narrativeShift.previous.map((t, i) => (
                                    <div key={i} className="text-xs py-1.5 px-3 rounded bg-muted/30 border border-border/50 text-muted-foreground">
                                        {t}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-purple-600 dark:text-purple-400 font-bold">Emerging Themes</p>
                                {impact.narrativeShift.emerging.map((t, i) => (
                                    <div key={i} className="text-xs py-1.5 px-3 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-foreground font-medium">
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-border/40">
                            <p className="text-xs italic text-muted-foreground leading-relaxed">
                                <span className="font-bold text-foreground not-italic mr-1">AI Verdict:</span>
                                "{impact.narrativeShift.interpretation}"
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col border-emerald-500/20 bg-emerald-500/[0.02]">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-emerald-500" />
                            Strategic Forecast
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-900 dark:text-emerald-100 italic text-sm font-medium">
                            "{impact.strategicForecast.forecast}"
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Watch List (Impending Events)</p>
                            <div className="space-y-2">
                                {impact.strategicForecast.watchSignals.map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Breakdown */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Channel Pulse Breakdown</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <PlatformMetricCard
                        platform="LinkedIn"
                        icon={<Linkedin className="h-4 w-4 text-blue-600" />}
                        metrics={impact.platformMetrics.linkedin}
                        colorClass="text-blue-600"
                    />
                    <PlatformMetricCard
                        platform="X / Twitter"
                        icon={<Twitter className="h-4 w-4 text-foreground" />}
                        metrics={impact.platformMetrics.twitter}
                        colorClass="text-foreground"
                    />
                    <PlatformMetricCard
                        platform="YouTube"
                        icon={<Youtube className="h-4 w-4 text-red-600" />}
                        metrics={impact.platformMetrics.youtube}
                        colorClass="text-red-600"
                    />
                    <PlatformMetricCard
                        platform="Engagement Index"
                        icon={<Activity className="h-4 w-4 text-purple-600" />}
                        metrics={impact.platformMetrics.instagram} // reuse for slots
                        colorClass="text-purple-600"
                    />
                </div>
            </div>

            {/* Signal Clustering */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Active Signal Clusters
                    </CardTitle>
                    <CardDescription>Patterns detected across decentralized social sources</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        {impact.signalClusters.map((cluster, i) => (
                            <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    {cluster.title}
                                </h4>
                                <ul className="space-y-2">
                                    {cluster.signals.map((sig, j) => (
                                        <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <span className="mt-1 h-1 w-1 rounded-full bg-primary shrink-0" />
                                            {sig}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Top Interactions */}
            <div className="space-y-4 pb-12">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-500" />
                    High-Impact Interactions
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {impact.topPosts.map((post, i) => (
                        <Card key={i} className="hover:border-primary/30 transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                                    <div className="flex items-center gap-1.5">
                                        {post.platform === 'linkedin' ? <Linkedin className="h-3 w-3 text-blue-600" /> : <Twitter className="h-3 w-3" />}
                                        {post.platform}
                                    </div>
                                    {post.date}
                                </div>
                                <p className="text-sm font-medium leading-relaxed mb-4">"{post.text}"</p>
                                <div className="flex items-center gap-4 text-[10px] font-bold">
                                    <span className="text-emerald-600">Engagement: {post.engagement}</span>
                                    <span className="text-primary hover:underline cursor-pointer">View Original Source →</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

import { Activity } from "lucide-react";
