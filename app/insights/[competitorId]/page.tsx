export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
    Brain,
    Sparkles,
    TrendingUp,
    AlertCircle,
    Zap,
    Target,
    ArrowRight,
    ShieldCheck,
    Activity,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockIntelligence } from "./mock-data";

export default async function InsightDetailPage({
    params,
}: {
    params: { competitorId: string };
}) {
    const { competitorId } = params;
    const workspaceId = await getOrCreateWorkspaceId();

    if (!workspaceId) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-muted-foreground">You must be signed in to view insights.</p>
                <Button asChild>
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        );
    }

    const supabase = await createClient();

    // Basic check to ensure competitor exists in this workspace
    const { data: competitor } = await supabase
        .from("competitors")
        .select("id, name, url")
        .eq("id", competitorId)
        .eq("workspace_id", workspaceId)
        .single();

    if (!competitor) notFound();

    // DEMO MODE: Use Dynamic Mock Data based on Competitor Name/ID
    const data = getMockIntelligence(competitor.id, competitor.name);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* 1️⃣ PAGE HEADER */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/insights" className="hover:text-primary transition-colors">Insights</Link>
                        <span>/</span>
                        <span className="font-medium text-foreground">{data.companyName}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        {data.companyName}
                        <Badge variant="outline" className="ml-2 font-normal bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            {data.monitoringStatus}
                        </Badge>
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Activity className="h-4 w-4" />
                            Last Analyzed: {data.lastAnalyzed}
                        </span>
                        <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                            <Brain className="h-4 w-4" />
                            AI Confidence: {data.aiConfidenceScore}%
                        </span>
                    </div>
                </div>
                <div>
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/10 dark:text-purple-300 dark:border-purple-800 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Strategic Engine Active
                    </Badge>
                </div>
            </div>

            {/* 2️⃣ EXECUTIVE VERDICT (TOP PRIORITY CARD) */}
            <Card className="border-l-4 border-l-purple-500 shadow-md bg-gradient-to-br from-background to-purple-50/30 dark:to-purple-900/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            Executive Strategic Verdict
                        </CardTitle>
                        <Badge className="bg-purple-600 hover:bg-purple-700">High Confidence</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Strategic Posture</h4>
                            <p className="text-2xl font-bold text-foreground">{data.executiveVerdict.strategicPosture}</p>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Motion</h4>
                            <p className="text-lg font-medium text-foreground/80">{data.executiveVerdict.currentMotion}</p>
                        </div>
                    </div>
                    <div className="space-y-6 border-l pl-8 border-purple-100 dark:border-purple-800/30">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Risk Level</h4>
                                <div className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full ${data.executiveVerdict.riskLevel === 'High' ? 'bg-red-500' : data.executiveVerdict.riskLevel === 'Moderate' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                    <span className="font-medium">{data.executiveVerdict.riskLevel}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Momentum</h4>
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="font-medium">{data.executiveVerdict.momentumDirection}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signals Used</h4>
                            <div className="flex flex-wrap gap-2">
                                {data.executiveVerdict.signalsUsed.map(signal => (
                                    <Badge key={signal} variant="secondary" className="text-xs bg-background border">{signal}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3️⃣ STRATEGIC MOVEMENT (Last 30 Days) */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Strategic Movement <span className="text-muted-foreground font-normal text-sm ml-1">(Last 30 Days)</span>
                </h2>
                <Card>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-3 gap-8 mb-6">
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-foreground/80">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" /> Messaging Changes
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {data.strategicMovement.messagingChanges.map((change, i) => (
                                        <li key={i}>• {change}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3 border-l pl-6 border-border/50">
                                <h3 className="font-semibold flex items-center gap-2 text-foreground/80">
                                    <div className="h-2 w-2 rounded-full bg-green-500" /> Pricing & Monetization
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {data.strategicMovement.pricingChanges.map((change, i) => (
                                        <li key={i}>• {change}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3 border-l pl-6 border-border/50">
                                <h3 className="font-semibold flex items-center gap-2 text-foreground/80">
                                    <div className="h-2 w-2 rounded-full bg-orange-500" /> GTM Signals
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {data.strategicMovement.gtmSignals.map((change, i) => (
                                        <li key={i}>• {change}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg flex gap-3 items-start border border-blue-100 dark:border-blue-800">
                            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300">AI Interpretation</h4>
                                <p className="text-sm text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                                    {data.strategicMovement.aiInterpretation}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 4️⃣ COMPETITIVE STRENGTH & RISK ANALYSIS */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-500" />
                    Competitive Strength & Risk Analysis
                </h2>
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/30"><TrendingUp className="h-4 w-4" /></div>
                                    Strength Signals
                                </h3>
                                <ul className="space-y-3">
                                    {data.strengthRiskAnalysis.strengths.map((s, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <div className="p-1 rounded bg-red-100 dark:bg-red-900/30"><AlertCircle className="h-4 w-4" /></div>
                                    Risk Signals
                                </h3>
                                <ul className="space-y-3">
                                    {data.strengthRiskAnalysis.risks.map((s, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="border-t pt-4 mt-2">
                            <div className="flex gap-2 items-start text-sm">
                                <span className="font-semibold text-muted-foreground whitespace-nowrap">Strategic Implication:</span>
                                <span className="font-medium text-foreground">{data.strengthRiskAnalysis.strategicImplication}</span>
                                <Badge variant="outline" className="ml-auto text-xs shrink-0">Confidence: {data.strengthRiskAnalysis.confidence}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 5️⃣ AI DETECTED NARRATIVE DRIFT & 6️⃣ BLOG INTELLIGENCE */}
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Narrative Drift
                    </h2>
                    <Card className="h-full">
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6 relative">
                                <div className="space-y-3 opacity-70">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Past Focus (90d ago)</h3>
                                    <ul className="space-y-2 text-sm">
                                        {data.narrativeDrift.pastFocus.map(f => (
                                            <li key={f} className="flex items-center gap-2 decoration-muted-foreground/40 line-through"><div className="h-1.5 w-1.5 rounded-full bg-gray-400" />{f}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Current Focus</h3>
                                    <ul className="space-y-2 text-sm font-medium">
                                        {data.narrativeDrift.currentFocus.map(f => (
                                            <li key={f} className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="p-3 rounded bg-muted/40 text-sm italic border-l-2 border-yellow-500 text-muted-foreground">
                                "NOTE: {data.narrativeDrift.aiConclusion}"
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Brain className="h-5 w-5 text-emerald-600" />
                        Blog Intelligence
                    </h2>
                    <Card className="h-full">
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Content Themes</h3>
                                <div className="flex flex-wrap gap-2">
                                    {data.blogIntelligence.topThemes.map(t => (
                                        <Badge key={t} variant="secondary">{t}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Funnel Intent Distribution</h3>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="p-2 rounded bg-muted/30 border">
                                        <span className="block text-xs text-muted-foreground">Top</span>
                                        <span className="font-bold text-green-600">{data.blogIntelligence.funnelIntent.top}</span>
                                    </div>
                                    <div className="p-2 rounded bg-muted/30 border">
                                        <span className="block text-xs text-muted-foreground">Mid</span>
                                        <span className="font-bold text-yellow-600">{data.blogIntelligence.funnelIntent.mid}</span>
                                    </div>
                                    <div className="p-2 rounded bg-muted/30 border">
                                        <span className="block text-xs text-muted-foreground">Bottom</span>
                                        <span className="font-bold text-red-400">{data.blogIntelligence.funnelIntent.bottom}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Suggested Counter-Move</h3>
                                <p className="text-sm font-medium flex gap-2 items-start">
                                    <ArrowRight className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                    {data.blogIntelligence.suggestedCounterMove}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 7️⃣ STRATEGIC WATCH ALERTS */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Strategic Watch Alerts
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {data.watchAlerts.map((alert, i) => (
                        <Card key={i} className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/50">
                            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-500" />
                                <span className="font-medium text-sm text-orange-900 dark:text-orange-100">{alert}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* 8️⃣ COLLAPSIBLE ADVANCED SECTION */}
            <Collapsible>
                <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full flex justify-between items-center group")}>
                    <span className="font-semibold text-muted-foreground group-hover:text-foreground">Advanced Signal Breakdown</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                    <Card className="bg-muted/20">
                        <CardContent className="p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Homepage Headlines</h4>
                                <p className="text-sm font-mono text-foreground/80">{data.advancedSignals.headlineFrequency}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">CTA Shift Tracking</h4>
                                <p className="text-sm font-mono text-foreground/80">{data.advancedSignals.ctaShift}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Pricing Structure</h4>
                                <p className="text-sm font-mono text-foreground/80">{data.advancedSignals.pricingStructure}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Content Volume</h4>
                                <p className="text-sm font-mono text-foreground/80">{data.advancedSignals.contentVolume}</p>
                            </div>
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>

        </div>
    );
}
