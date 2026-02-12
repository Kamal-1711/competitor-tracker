import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    DollarSign,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    Activity,
    Cpu,
    Search,
    ChevronDown,
    Layers,
    Box,
    Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockPricingIntelligence, MonetizationIntelligence } from "./mock-data";

export default async function PricingPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-muted-foreground">You must be signed in to view pricing intelligence.</p>
                <Button asChild>
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        );
    }

    const supabase = await createClient();

    const params = await searchParams;
    const selectedCompetitorIdParam =
        typeof params.competitorId === "string" ? params.competitorId : null;

    const { data: competitorsData } = await supabase
        .from("competitors")
        .select("id, name, url")
        .eq("workspace_id", workspaceId);

    const competitors = competitorsData ?? [];

    if (competitors.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">Monetization Intelligence</h1>
                <EmptyState
                    title="No competitors yet"
                    description="Add competitors on the Competitors page to activate the AI Monetization Engine."
                />
            </div>
        );
    }

    const selectedCompetitor =
        competitors.find((competitor) => competitor.id === selectedCompetitorIdParam) ?? competitors[0];

    // AI MONETIZATION ENGINE (DEMO MODE)
    const data: MonetizationIntelligence = getMockPricingIntelligence(selectedCompetitor.id, selectedCompetitor.name);

    // Still fetch screenshots for the Advanced section
    const { data: screenshotRows = [] } = await supabase
        .from("snapshots")
        .select("id, url, screenshot_url, created_at")
        .eq("competitor_id", selectedCompetitor.id)
        .eq("page_type", "pricing")
        .order("created_at", { ascending: false })
        .limit(12);

    const safeScreenshotRows = screenshotRows ?? [];

    return (
        <div className="space-y-8 pb-12">
            {/* 1️⃣ HEADER */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        {selectedCompetitor.name}
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            {data.monitoringStatus}
                        </Badge>
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Activity className="h-4 w-4" />
                            Last Pricing Analysis: {data.lastAnalyzed}
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                            <Cpu className="h-4 w-4" />
                            AI Monetization Confidence: {data.aiMonetizationConfidence}%
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-800 flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        AI Monetization Engine Active
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                        {competitors.map((competitor) => (
                            <Button
                                key={competitor.id}
                                asChild
                                size="sm"
                                variant={competitor.id === selectedCompetitor.id ? "default" : "outline"}
                                className={competitor.id === selectedCompetitor.id ? "bg-blue-600 hover:bg-blue-700" : ""}
                            >
                                <Link href={`/dashboard/pricing?competitorId=${competitor.id}`}>
                                    {competitor.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2️⃣ EXECUTIVE PRICING VERDICT (HERO CARD) */}
            <Card className="border-l-4 border-l-blue-500 shadow-md bg-gradient-to-br from-background to-blue-50/20 dark:to-blue-900/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            Monetization Strategic Summary
                        </CardTitle>
                        <Badge className="bg-blue-600 hover:bg-blue-700">High Confidence</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing Model</h4>
                            <p className="text-xl font-bold text-foreground">{data.executiveVerdict.pricingModel}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Maturity</h4>
                                <p className="font-medium">{data.executiveVerdict.monetizationMaturity}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stability</h4>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "font-medium",
                                        data.executiveVerdict.pricingStability === "Stable" ? "text-green-600" : "text-orange-500"
                                    )}>{data.executiveVerdict.pricingStability}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 border-l pl-8 border-blue-100 dark:border-blue-800/30">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Summary</h4>
                            <p className="text-base text-foreground/90 leading-relaxed italic">
                                "{data.executiveVerdict.aiSummary}"
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div>
                                <span className="block text-muted-foreground">Upmarket Movement</span>
                                <span className="font-semibold">{data.executiveVerdict.upmarketMovement}</span>
                            </div>
                            <div>
                                <span className="block text-muted-foreground">Competitive Pressure</span>
                                <span className="font-semibold">{data.executiveVerdict.competitivePressure}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3️⃣ PRICING STRUCTURE ANALYSIS */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    Pricing Structure Analysis
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-muted-foreground">Plans & Tiers</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium">
                                {data.structureAnalysis.plansAndTiers.map((p, i) => (
                                    <li key={i} className="flex gap-2 items-start"><div className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />{p}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-muted-foreground">Entry Barrier</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium">
                                {data.structureAnalysis.entryBarrier.map((p, i) => (
                                    <li key={i} className="flex gap-2 items-start"><div className="h-1.5 w-1.5 bg-green-500 rounded-full mt-1.5 shrink-0" />{p}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-muted-foreground">Tier Strategy</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium">
                                {data.structureAnalysis.tierStrategy.map((p, i) => (
                                    <li key={i} className="flex gap-2 items-start"><div className="h-1.5 w-1.5 bg-orange-500 rounded-full mt-1.5 shrink-0" />{p}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800">
                    <CardContent className="p-4 flex gap-3 items-start">
                        <Cpu className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">AI Insight</h4>
                            <p className="text-sm text-indigo-800/80 dark:text-indigo-200/80">{data.structureAnalysis.aiInsight}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 4️⃣ MONETIZATION SIGNALS & 5️⃣ PACKAGING */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        Monetization Signals <span className="text-muted-foreground font-normal text-sm">(Last 30 Days)</span>
                    </h2>
                    <Card className="h-full">
                        <CardContent className="p-6 space-y-4">
                            <ul className="space-y-3">
                                {data.monetizationSignals.detectedChanges.map((c, i) => (
                                    <li key={i} className="text-sm flex gap-2 p-2 rounded bg-muted/30">
                                        <Search className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        {c}
                                    </li>
                                ))}
                            </ul>
                            <div className="border-t pt-3">
                                <p className="text-sm italic text-muted-foreground">"{data.monetizationSignals.aiInterpretation}"</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Box className="h-5 w-5 text-purple-500" />
                        Packaging & Positioning
                    </h2>
                    <Card className="h-full">
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-xs uppercase text-muted-foreground mb-1">Feature Gating</span>
                                    <Badge variant="secondary">{data.packagingPositioning.featureGatingIntensity}</Badge>
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-muted-foreground mb-1">Upsell Depth</span>
                                    <span className="font-semibold">{data.packagingPositioning.upsellDepth}</span>
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs uppercase text-muted-foreground mb-1">Value Framing</span>
                                <p className="font-medium text-sm">{data.packagingPositioning.valueFraming}</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800">
                                <p className="text-sm text-purple-800 dark:text-purple-200">
                                    <span className="font-bold">AI Analysis:</span> {data.packagingPositioning.aiAnalysis}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 6️⃣ STRATEGIC RISKS & OPPORTUNITIES */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-500" />
                    Strategic Risks & Opportunities
                </h2>
                <Card>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" /> Strength Signals
                                </h3>
                                <ul className="space-y-2">
                                    {data.strategicRisks.strengths.map((s, i) => (
                                        <li key={i} className="text-sm flex gap-2">
                                            <span className="text-green-500">•</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3 border-l pl-8 border-border/50">
                                <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Risk Signals
                                </h3>
                                <ul className="space-y-2">
                                    {data.strategicRisks.risks.map((s, i) => (
                                        <li key={i} className="text-sm flex gap-2">
                                            <span className="text-red-500">•</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t flex items-center justify-between">
                            <div className="flex gap-2 items-center">
                                <span className="text-sm font-bold text-foreground">Strategic Implication:</span>
                                <span className="text-sm text-muted-foreground">{data.strategicRisks.strategicImplication}</span>
                            </div>
                            <Badge variant="outline">Confidence: {data.strategicRisks.confidence}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 7️⃣ COMPETITIVE POSITIONING VS MARKET */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Market Positioning
                </h2>
                <Card className="bg-slate-50 dark:bg-slate-900/50">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 space-y-3">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground">Compared to Peers</h4>
                            <div className="flex flex-wrap gap-2">
                                {data.competitivePositioning.vsPeers.map((p, i) => (
                                    <Badge key={i} variant="secondary" className="bg-background border shadow-sm">{p}</Badge>
                                ))}
                            </div>
                        </div>
                        <div className="md:w-1/3 p-4 bg-background border rounded-lg shadow-sm">
                            <p className="text-sm font-medium text-center">
                                "{data.competitivePositioning.aiConclusion}"
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 8️⃣ COLLAPSIBLE ADVANCED SECTION */}
            <Collapsible>
                <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full flex justify-between items-center group py-6")}>
                    <span className="font-semibold text-muted-foreground group-hover:text-foreground">Advanced Monetization Signals (Raw Data & Screenshots)</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-8">
                    {/* Signal Table */}
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Signal Keywords</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-3 gap-6">
                            <div>
                                <span className="text-xs text-muted-foreground uppercase">Headline Focus</span>
                                <p className="font-mono text-sm">{data.advancedSignals.headlineKeywords}</p>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground uppercase">CTA Language</span>
                                <p className="font-mono text-sm">{data.advancedSignals.ctaLanguage}</p>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground uppercase">Gating Dist.</span>
                                <p className="font-mono text-sm">{data.advancedSignals.gatingDistribution}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Screenshot Archive (Moved from top) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visual Evidence Archive</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {safeScreenshotRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No pricing screenshots captured yet.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {safeScreenshotRows.map((snapshot) => (
                                        <div key={(snapshot as { id: string }).id} className="space-y-2 rounded-md border p-3">
                                            {(snapshot as { screenshot_url: string | null }).screenshot_url ? (
                                                <a
                                                    href={(snapshot as { screenshot_url: string }).screenshot_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={(snapshot as { screenshot_url: string }).screenshot_url}
                                                        alt="Pricing evidence"
                                                        className="w-full rounded-md border object-cover h-40"
                                                        loading="lazy"
                                                    />
                                                </a>
                                            ) : (
                                                <div className="flex h-36 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                                                    No screenshot
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {new Date((snapshot as { created_at: string }).created_at).toLocaleString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
