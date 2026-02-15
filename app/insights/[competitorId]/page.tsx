export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompanyProfileCard from "@/components/insights/company-profile-card";
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
    ChevronDown,
    DollarSign,
    FileText,
    Terminal
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

            {/* 1️⃣ COMPANY PROFILE */}
            <CompanyProfileCard company={data.companyProfile} />

            {/* 2️⃣ STRATEGIC SNAPSHOT (Renamed from Executive Verdict) */}
            <Card className="border-l-4 border-l-purple-500 shadow-md bg-gradient-to-br from-background to-purple-50/30 dark:to-purple-900/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            Strategic Snapshot
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

            {/* 3️⃣ MOVEMENT SUMMARY (Last 30 Days) */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Movement Summary <span className="text-muted-foreground font-normal text-sm ml-1">(Last 30 Days)</span>
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
                    Strengths & Risks
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
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 5️⃣ PRICING INTELLIGENCE */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Pricing Intelligence
                </h2>
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Detected Plans</h4>
                                <ul className="space-y-3">
                                    {data.pricingIntelligence.plans.map((plan, i) => (
                                        <li key={i} className="flex justify-between items-start border-b pb-2 last:border-0 border-border/50">
                                            <div>
                                                <p className="font-semibold text-sm">{plan.name}</p>
                                                <p className="text-xs text-muted-foreground">{plan.features.join(", ")}</p>
                                            </div>
                                            <span className="font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-sm">
                                                {plan.price}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent Pricing Changes</h4>
                                    {data.pricingIntelligence.recentChanges.length > 0 ? (
                                        <ul className="space-y-2">
                                            {data.pricingIntelligence.recentChanges.map((change, i) => (
                                                <li key={i} className="text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                                    <AlertCircle className="h-3 w-3" /> {change}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No pricing structure changes detected in last 90 days.</p>
                                    )}
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded border border-emerald-100 dark:border-emerald-500/10">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">AI Pricing Strategy Analysis</h4>
                                    <p className="text-sm text-emerald-900 dark:text-emerald-100 italic">
                                        &quot;{data.pricingIntelligence.aiAnalysis}&quot;
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 6️⃣ BLOG / CONTENT INTELLIGENCE */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    Blog & Content Intelligence
                </h2>
                <Card>
                    <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Top Content Themes</h3>
                                <div className="flex flex-wrap gap-2">
                                    {data.blogIntelligence.topThemes.map(t => (
                                        <Badge key={t} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300">
                                            {t}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Content Funnel Intent</h3>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="p-2 rounded bg-muted/30 border">
                                        <span className="block text-xs text-muted-foreground mb-1">Top</span>
                                        <span className="font-bold text-green-600 uppercase text-xs">{data.blogIntelligence.funnelIntent.top}</span>
                                    </div>
                                    <div className="p-2 rounded bg-muted/30 border">
                                        <span className="block text-xs text-muted-foreground mb-1">Mid</span>
                                        <span className="font-bold text-yellow-600 uppercase text-xs">{data.blogIntelligence.funnelIntent.mid}</span>
                                    </div>
                                    <div className="p-2 rounded bg-muted/30 border">
                                        <span className="block text-xs text-muted-foreground mb-1">Bottom</span>
                                        <span className="font-bold text-red-500 uppercase text-xs">{data.blogIntelligence.funnelIntent.bottom}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center space-y-4 border-l pl-8 border-border/50">
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase">AI Content Insight</h4>
                                <p className="text-sm font-medium">{data.blogIntelligence.aiInsight}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg border-l-2 border-indigo-500">
                                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Recommended Counter-Move</h4>
                                <p className="text-sm italic text-muted-foreground">&quot;{data.blogIntelligence.suggestedCounterMove}&quot;</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 7️⃣ ADVANCED SEO (Collapsible) */}
            <Collapsible>
                <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full flex justify-between items-center group bg-background")}>
                    <span className="font-semibold text-muted-foreground group-hover:text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Advanced SEO & Signal Breakdown
                    </span>
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

            {/* 8️⃣ RAW LOGS (Collapsible) */}
            <Collapsible>
                <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full flex justify-between items-center group bg-background mt-4")}>
                    <span className="font-semibold text-muted-foreground group-hover:text-foreground flex items-center gap-2">
                        <Terminal className="h-4 w-4" /> System Logs (Raw)
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                    <Card className="bg-black/95 border-neutral-800">
                        <CardContent className="p-4 font-mono text-xs text-green-500/80 space-y-1">
                            {data.rawLogs.length > 0 ? (
                                data.rawLogs.map((log, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="text-neutral-500">[{log.timestamp}]</span>
                                        <span className="text-blue-400">[{log.source}]</span>
                                        <span>{log.event}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-neutral-500 italic">No recent system logs available for this entity.</div>
                            )}
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>

        </div>
    );
}
