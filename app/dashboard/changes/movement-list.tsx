"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Layers,
    MessageSquare,
    ShieldCheck,
    TrendingUp,
    Target
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StrategicMovement {
    id: string;
    competitor_id: string;
    page_url: string;
    page_type: string | null;
    change_cluster_count: number;
    movement_category: string;
    impact_level: "HIGH" | "MEDIUM" | "LOW";
    summary: string | null;
    interpretation: string | null;
    suggested_action: string | null;
    created_at: string;
    competitors: { name: string | null; url: string } | { name: string | null; url: string }[] | null;
}

interface MovementListProps {
    movements: StrategicMovement[];
}

export function MovementList({ movements }: MovementListProps) {
    const highImpact = movements.filter((m) => m.impact_level === "HIGH");
    const mediumImpact = movements.filter((m) => m.impact_level === "MEDIUM");
    const lowImpact = movements.filter((m) => m.impact_level === "LOW");

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    High Impact Movements
                </h3>
                {highImpact.length > 0 ? (
                    <div className="grid gap-4">
                        {highImpact.map((m) => (
                            <MovementCard key={m.id} movement={m} defaultExpanded={true} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic ml-4">No high impact movements detected.</p>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium Impact Movements
                </h3>
                {mediumImpact.length > 0 ? (
                    <div className="grid gap-4">
                        {mediumImpact.map((m) => (
                            <MovementCard key={m.id} movement={m} defaultExpanded={true} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic ml-4">No medium impact movements detected.</p>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 text-muted-foreground/60">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    Low Impact Movements
                </h3>
                {lowImpact.length > 0 ? (
                    <Collapsible defaultOpen={false}>
                        <CollapsibleTrigger className="w-full justify-between h-8 border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 px-3 rounded-md transition-all flex items-center">
                            <span>Show {lowImpact.length} Compliance & Maintenance items</span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-4 space-y-4">
                            {lowImpact.map((m) => (
                                <MovementCard key={m.id} movement={m} defaultExpanded={false} />
                            ))}
                        </CollapsibleContent>
                    </Collapsible>
                ) : (
                    <p className="text-sm text-muted-foreground italic ml-4">No low impact movements detected.</p>
                )}
            </div>
        </div>
    );
}

function MovementCard({
    movement,
    defaultExpanded = false
}: {
    movement: StrategicMovement;
    defaultExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const categoryIcons: Record<string, any> = {
        "Pricing Movement": TrendingUp,
        "Content Expansion": Layers,
        "Compliance Update": ShieldCheck,
        "Conversion Optimization": Target,
        "Positioning Adjustment": MessageSquare,
    };

    const Icon = categoryIcons[movement.movement_category] || MessageSquare;

    const impactColors = {
        HIGH: "bg-red-500/10 text-red-500 border-red-500/20",
        MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        LOW: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };

    const competitor = Array.isArray(movement.competitors)
        ? movement.competitors[0]
        : movement.competitors;
    const competitorName = competitor?.name || "Unknown Competitor";

    return (
        <Card className="overflow-hidden bg-background/50 border-border/50 shadow-sm transition-all hover:bg-background/80">
            <CardHeader className="py-4 border-b border-border/10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", impactColors[movement.impact_level])}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground leading-none">{competitorName}</h4>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 uppercase font-bold tracking-tighter", impactColors[movement.impact_level])}>
                                    {movement.impact_level}
                                </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                {movement.movement_category}
                                <span className="text-muted-foreground/30">•</span>
                                <Badge variant="secondary" className="px-1 h-3.5 text-[9px] bg-muted/30 text-muted-foreground font-normal">
                                    {movement.page_type || "General Page"}
                                </Badge>
                                <span className="text-muted-foreground/30">•</span>
                                <span>Detected {new Date(movement.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                            {movement.change_cluster_count} Clusters
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "")} />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="py-4 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div>
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 shadow-sm">Analysis Summary</h5>
                                <p className="text-sm text-foreground leading-relaxed">{movement.summary}</p>
                            </div>
                            <div>
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Strategic Interpretation</h5>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                                        {movement.interpretation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <h5 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    Suggested Action
                                </h5>
                                <p className="text-sm text-foreground/80 font-medium">
                                    {movement.suggested_action}
                                </p>
                            </div>
                            <div>
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Impacted URL</h5>
                                <a
                                    href={movement.page_url}
                                    target="_blank"
                                    className="text-xs text-primary flex items-center gap-1 hover:underline truncate underline-offset-4"
                                >
                                    {movement.page_url}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
