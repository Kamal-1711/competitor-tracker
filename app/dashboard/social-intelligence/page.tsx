import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, TrendingUp, Info } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CompetitorSocialCard } from "@/components/social/competitor-social-card";
import { getSocialImpactForCompetitor } from "@/lib/social-intelligence/mock-generator";

export default async function SocialIntelligencePage() {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) return null;

    const supabase = await createClient();
    const { data: competitors } = await supabase
        .from("competitors")
        .select("id, name")
        .eq("workspace_id", workspaceId);

    if (!competitors || competitors.length === 0) {
        return (
            <EmptyState
                title="No competitors tracked"
                description="Add competitors to start tracking their social intelligence signals."
            >
                <Button asChild>
                    <Link href="/dashboard/competitors">Add Competitor</Link>
                </Button>
            </EmptyState>
        );
    }

    // Calculate market pulse (mocked globally)
    const totalMomentum = 78;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Brain className="h-8 w-8 text-primary" />
                        Social Intelligence
                        <Badge variant="outline" className="ml-2 text-xs font-normal">
                            Alpha
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        Monitor narrative shifts, sentiment trends, and momentum across your competitive landscape.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-3 border-l-4 border-l-purple-500 bg-gradient-to-br from-background to-purple-500/5">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                Aggregated Market Pulse
                            </CardTitle>
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">AI Synthesized</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg leading-relaxed font-medium">
                            Overall market momentum is <span className="text-purple-600">Rising (+12%)</span>.
                            The dominant narrative has shifted from &quot;Integration Efficiency&quot; to &quot;Autonomous Operations&quot; across 4/6 tracked competitors.
                        </p>
                        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                High Sentiment: 65%
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Primary Channel: LinkedIn
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-muted/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Pulse Index
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-4">
                        <div className="text-4xl font-bold text-primary">{totalMomentum}%</div>
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tighter">Market Connectivity</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        Competitor Intelligence Maps
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </h2>
                    <div className="text-xs text-muted-foreground italic">
                        Snapshot: Last 30 Days
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {competitors.map((comp) => (
                        <CompetitorSocialCard
                            key={comp.id}
                            name={comp.name}
                            competitorId={comp.id}
                            impact={getSocialImpactForCompetitor(comp.id, comp.name)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
